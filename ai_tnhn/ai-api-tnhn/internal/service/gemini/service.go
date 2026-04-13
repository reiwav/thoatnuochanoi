package gemini

import (
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/contract"
	"ai-api-tnhn/internal/service/emergency_construction"
	"ai-api-tnhn/internal/service/googleapi"
	"ai-api-tnhn/internal/service/inundation"
	"ai-api-tnhn/internal/service/query"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/stationdata"
	"ai-api-tnhn/internal/service/water"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"ai-api-tnhn/internal/models"

	"github.com/google/generative-ai-go/genai"
	"golang.org/x/sync/errgroup"
	"google.golang.org/api/option"
)

type ChatMessage struct {
	Role    string `json:"role"` // "user" or "model"
	Content string `json:"content"`
}

type Service interface {
	Chat(ctx context.Context, prompt string, history []ChatMessage, userID string, isCompany bool, logPrompt string) (string, error)
	ChatContract(ctx context.Context, prompt string, history []ChatMessage, userID string, isCompany bool, logPrompt string) (string, error)
	ExtractTextFromPDF(ctx context.Context, pdfBytes []byte) (string, error)
}

type service struct {
	clients               []*genai.Client
	contractClients       []*genai.Client
	mu                    sync.Mutex
	roundRobinIdx         int
	contractRoundRobinIdx int
	waterSvc              water.Service
	googleApiSvc          googleapi.Service
	inuSvc                inundation.Service
	querySvc              query.Service
	stationDataSvc        stationdata.Service
	emcSvc                emergency_construction.Service
	contractSvc           contract.Service
	stationSvc            station.Service
	aiUsageRepo           repository.AiUsage
	aiChatLogRepo         repository.AiChatLog
	userRepo              repository.User
}

func NewService(apiKey string, apiKeyContract string, waterSvc water.Service, googleApiSvc googleapi.Service, inuSvc inundation.Service, querySvc query.Service, stationDataSvc stationdata.Service, emcSvc emergency_construction.Service, contractSvc contract.Service, stationSvc station.Service, aiUsageRepo repository.AiUsage, aiChatLogRepo repository.AiChatLog, userRepo repository.User) (Service, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("gemini api key is required")
	}

	keys := strings.Split(apiKey, ",")
	var clients []*genai.Client
	var contractClients []*genai.Client
	ctx := context.Background()

	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		client, err := genai.NewClient(ctx, option.WithAPIKey(key))
		if err == nil {
			clients = append(clients, client)
		}
	}

	contractKeys := strings.Split(apiKeyContract, ",")
	for _, key := range contractKeys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		client, err := genai.NewClient(ctx, option.WithAPIKey(key))
		if err == nil {
			contractClients = append(contractClients, client)
		}
	}

	if len(clients) == 0 {
		return nil, fmt.Errorf("failed to create any valid gemini client")
	}

	if len(contractClients) == 0 {
		contractClients = clients
	}

	return &service{
		clients:         clients,
		contractClients: contractClients,
		waterSvc:        waterSvc,
		googleApiSvc:    googleApiSvc,
		inuSvc:          inuSvc,
		querySvc:        querySvc,
		stationDataSvc:  stationDataSvc,
		emcSvc:          emcSvc,
		contractSvc:     contractSvc,
		stationSvc:      stationSvc,
		aiUsageRepo:     aiUsageRepo,
		aiChatLogRepo:   aiChatLogRepo,
		userRepo:        userRepo,
	}, nil
}

func (s *service) getClient() *genai.Client {
	s.mu.Lock()
	defer s.mu.Unlock()
	client := s.clients[s.roundRobinIdx]
	s.roundRobinIdx = (s.roundRobinIdx + 1) % len(s.clients)
	return client
}

func (s *service) getContractClient() *genai.Client {
	s.mu.Lock()
	defer s.mu.Unlock()
	client := s.contractClients[s.contractRoundRobinIdx]
	s.contractRoundRobinIdx = (s.contractRoundRobinIdx + 1) % len(s.contractClients)
	return client
}

func (s *service) Chat(ctx context.Context, prompt string, history []ChatMessage, userID string, isCompany bool, logPrompt string) (string, error) {
	// Keep raw prompt for logging
	rawPrompt := prompt
	augmentedPrompt := prompt

	// Pre-process prompt for special keywords (mưa 3 ngày trước)
	lowerPrompt := strings.ToLower(prompt)
	if strings.Contains(lowerPrompt, "mưa") && (strings.Contains(lowerPrompt, "3 ngày trước") || strings.Contains(lowerPrompt, "ba ngày trước")) {
		now := time.Now()
		targetDate := now.AddDate(0, 0, -3)
		dateStr := targetDate.Format("2006-01-02")

		rainData, err := s.waterSvc.GetRainDataByDate(ctx, dateStr)
		if err == nil {
			dataJSON, _ := json.Marshal(rainData)
			augmentedPrompt = fmt.Sprintf("[Hệ thống cung cấp thêm context]: Dữ liệu lượng mưa thực tế ngày %s (3 ngày trước tính từ %s): %s\n\n[Câu hỏi của người dùng]: %s",
				dateStr, now.Format("2006-01-02"), string(dataJSON), prompt)
		}
	} else {
		// Always add current time for context
		augmentedPrompt = fmt.Sprintf("[Hệ thống]: Thời gian hiện tại là %s\n\n[Câu hỏi của người dùng]: %s",
			time.Now().Format("2006-01-02 15:04:05"), prompt)
	}

	// Define Tools
	tools := s.getChatTools()

	client := s.getClient()
	model := client.GenerativeModel("gemini-2.5-flash")
	model.SystemInstruction = &genai.Content{Parts: []genai.Part{genai.Text(chatSysInstruction)}}
	model.Tools = []*genai.Tool{{FunctionDeclarations: tools}}

	// Build history
	var genaiHistory []*genai.Content
	for _, msg := range history {
		genaiHistory = append(genaiHistory, &genai.Content{
			Role:  msg.Role,
			Parts: []genai.Part{genai.Text(msg.Content)},
		})
	}

	session := model.StartChat()
	//session.History = genaiHistory

	fmt.Printf("\n=== [Gemini Chat] User Prompt ===\n%s\n=================================\n", augmentedPrompt)

	resp, err := session.SendMessage(ctx, genai.Text(augmentedPrompt))
	if err != nil {
		return "", fmt.Errorf("failed to send gemini message: %w", err)
	}
	s.recordUsage(ctx, resp.UsageMetadata)

	for {
		if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
			break
		}

		var toolCalls []*genai.FunctionCall
		for _, part := range resp.Candidates[0].Content.Parts {
			if call, ok := part.(genai.FunctionCall); ok {
				toolCalls = append(toolCalls, &call)
			}
		}

		if len(toolCalls) == 0 {
			break
		}

		var toolResponses []genai.Part
		var mu sync.Mutex
		g, gCtx := errgroup.WithContext(ctx)

		for _, call := range toolCalls {
			call := call // capture
			g.Go(func() error {
				fmt.Printf(" [Gemini Chat] Tool Call: %s with args: %v\n", call.Name, call.Args)

				result, toolErr := s.handleToolCall(gCtx, call, userID, isCompany)

				mu.Lock()
				defer mu.Unlock()

				if toolErr != nil {
					toolResponses = append(toolResponses, genai.FunctionResponse{
						Name:     call.Name,
						Response: map[string]interface{}{"error": toolErr.Error()},
					})
				} else {
					jsonBytes, _ := json.Marshal(result)
					respStr := string(jsonBytes)
					fmt.Printf("\n=== [Gemini Chat] Tool Result Data (%s) ===\n%s\n===============================================\n", call.Name, respStr)
					const maxContentLen = 30000
					if len(respStr) > maxContentLen {
						respStr = respStr[:maxContentLen] + "... (dữ liệu quá lớn, đã được cắt bớt để tối ưu context)"
					}
					toolResponses = append(toolResponses, genai.FunctionResponse{
						Name:     call.Name,
						Response: map[string]interface{}{"result": respStr},
					})
				}
				return nil
			})
		}

		_ = g.Wait()

		resp, err = session.SendMessage(ctx, toolResponses...)
		if err != nil {
			return "", fmt.Errorf("failed to send tool responses: %w", err)
		}
		s.recordUsage(ctx, resp.UsageMetadata)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "Xin lỗi, tôi không thể tìm thấy câu trả lời phù hợp.", nil
	}

	finalResult := ""
	for _, part := range resp.Candidates[0].Content.Parts {
		finalResult += fmt.Sprintf("%v", part)
	}

	// Save Chat Log
	go func() {
		if s.aiChatLogRepo != nil {
			now := time.Now()
			// Log User Message
			// Decide what content to save for the user message
			saveContent := rawPrompt
			if logPrompt != "" {
				saveContent = logPrompt
			}

			// Special case to skip logging if requested
			if logPrompt == "SKIP_LOG" {
				return
			}

			err := s.aiChatLogRepo.Save(context.Background(), &models.AiChatLog{
				UserID:    userID,
				Role:      "user",
				Content:   saveContent,
				ChatType:  "support",
				Timestamp: now.Add(-1 * time.Second),
			})
			if err != nil {
				fmt.Printf(" [Gemini Chat] Error saving user log: %v\n", err)
			} else {
				fmt.Printf(" [Gemini Chat] Saved user log for UserID: %s\n", userID)
			}
			// Log Model Response
			err = s.aiChatLogRepo.Save(context.Background(), &models.AiChatLog{
				UserID:    userID,
				Role:      "model",
				Content:   finalResult,
				ChatType:  "support",
				Timestamp: now,
			})
			if err != nil {
				fmt.Printf(" [Gemini Chat] Error saving model log: %v\n", err)
			} else {
				fmt.Printf(" [Gemini Chat] Saved model log for UserID: %s\n", userID)
			}
		}
	}()

	return finalResult, nil
}

func (s *service) ExtractTextFromPDF(ctx context.Context, pdfBytes []byte) (string, error) {
	client := s.getClient()
	model := client.GenerativeModel("gemini-2.5-flash") // Improved for extraction

	// Refined prompt for Page 1 only
	prompt := "Hãy trích xuất nội dung văn bản TRANG ĐẦU TIÊN (Trang 1) của file PDF này. Tuyệt đối không đọc các trang sau. Hãy trích xuất các thông tin về diễn biến thời tiết, lượng mưa, mực nước hồ và sông. Hãy trả về văn bản thuần túy, chính xác theo nội dung trong file."

	resp, err := model.GenerateContent(ctx,
		genai.Blob{MIMEType: "application/pdf", Data: pdfBytes},
		genai.Text(prompt),
	)
	if err != nil {
		return "", fmt.Errorf("failed to extract text via Gemini: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content generated by Gemini")
	}

	var result strings.Builder
	for _, part := range resp.Candidates[0].Content.Parts {
		result.WriteString(fmt.Sprintf("%v", part))
	}

	return result.String(), nil
}

func (s *service) recordUsage(ctx context.Context, usage *genai.UsageMetadata) {
	if usage == nil {
		return
	}
	u := &models.AiUsage{
		ModelName:       "gemini-2.5-flash",
		PromptTokens:    int(usage.PromptTokenCount),
		CandidateTokens: int(usage.CandidatesTokenCount),
		TotalTokens:     int(usage.TotalTokenCount),
		Timestamp:       time.Now(),
	}
	go func() {
		_ = s.aiUsageRepo.Save(context.Background(), u)
	}()
}
