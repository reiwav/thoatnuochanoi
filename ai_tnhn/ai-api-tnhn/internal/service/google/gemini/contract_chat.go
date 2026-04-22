package gemini

import (
	"ai-api-tnhn/internal/service/google/gemini/promt"
	"ai-api-tnhn/internal/models"
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/generative-ai-go/genai"
	"golang.org/x/sync/errgroup"
)

// ChatContract xử lý chat AI chuyên biệt cho quản lý hợp đồng.
// Tách riêng để phân quyền theo vai trò người dùng.
func (s *service) ChatContract(ctx context.Context, prompt string, history []ChatMessage, userID string, isCompany bool, logPrompt string) (string, error) {
	// 1. Lấy luân phiên client bằng getContractClient()
	client := s.getContractClient()
	model := client.GenerativeModel("gemini-2.5-flash")

	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text(promt.Get("contract_system")),
		},
	}

	// 2. Define tools for contract chat
	tools := []*genai.FunctionDeclaration{
		{
			Name:        "get_contract_summary",
			Description: "Lấy tổng quan hợp đồng: tổng số, đang hiệu lực, đã hết hạn, sắp hết hạn.",
		},
		{
			Name:        "get_expiring_contracts",
			Description: "Lấy danh sách hợp đồng sắp hết hạn.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"days": {Type: genai.TypeInteger, Description: "Số ngày tính từ hôm nay (mặc định 30)"},
				},
			},
		},
		{
			Name:        "get_expired_contracts",
			Description: "Lấy danh sách hợp đồng đã hết hạn.",
		},
		{
			Name:        "get_contract_stages_due_soon",
			Description: "Lấy danh sách các giai đoạn thanh toán sắp đến hạn.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"days": {Type: genai.TypeInteger, Description: "Số ngày tính từ hôm nay (mặc định 30)"},
				},
			},
		},
		{
			Name:        "get_contract_stages_passed",
			Description: "Lấy danh sách các giai đoạn thanh toán đã qua hạn.",
		},
		{
			Name:        "search_contracts",
			Description: "Tìm kiếm hợp đồng theo tên, từ khóa hoặc danh mục.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"keyword": {Type: genai.TypeString, Description: "Từ khóa tìm kiếm"},
				},
				Required: []string{"keyword"},
			},
		},
	}

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

	// Keep raw prompt for logging
	rawPrompt := prompt
	// Add current time context
	augmentedPrompt := fmt.Sprintf("[Hệ thống]: Thời gian hiện tại là %s\n\n[Câu hỏi của người dùng]: %s",
		time.Now().Format("2006-01-02 15:04:05"), prompt)

	fmt.Printf("\n=== [Gemini Contract Chat] User Prompt ===\n%s\n==========================================\n", augmentedPrompt)

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
				var result interface{}
				var toolErr error

				fmt.Printf(" [Gemini Contract Chat] Tool Call: %s with args: %v\n", call.Name, call.Args)

				switch call.Name {
				case "get_contract_summary":
					result, toolErr = s.contractSvc.GetContractSummary(gCtx)
				case "get_expiring_contracts":
					days := 30
					if d, ok := call.Args["days"].(float64); ok && d > 0 {
						days = int(d)
					}
					result, toolErr = s.contractSvc.GetExpiringSoon(gCtx, days)
				case "get_expired_contracts":
					result, toolErr = s.contractSvc.GetExpired(gCtx)
				case "get_contract_stages_due_soon":
					days := 30
					if d, ok := call.Args["days"].(float64); ok && d > 0 {
						days = int(d)
					}
					result, toolErr = s.contractSvc.GetStagesDueSoon(gCtx, days)
				case "get_contract_stages_passed":
					result, toolErr = s.contractSvc.GetStagesPassed(gCtx)
				case "search_contracts":
					keyword, _ := call.Args["keyword"].(string)
					result, toolErr = s.contractSvc.SearchContracts(gCtx, keyword)
				default:
					toolErr = fmt.Errorf("unknown tool: %s", call.Name)
				}

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
					fmt.Printf("\n=== [Gemini Contract Chat] Tool Result Data (%s) ===\n%s\n======================================================\n", call.Name, respStr)
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
				ChatType:  "contract",
				Timestamp: now.Add(-1 * time.Second),
			})
			if err != nil {
				fmt.Printf(" [Chat Contract] Error saving user log: %v\n", err)
			} else {
				fmt.Printf(" [Chat Contract] Saved user log for UserID: %s\n", userID)
			}
			// Log Model Response
			err = s.aiChatLogRepo.Save(context.Background(), &models.AiChatLog{
				UserID:    userID,
				Role:      "model",
				Content:   finalResult,
				ChatType:  "contract",
				Timestamp: now,
			})
			if err != nil {
				fmt.Printf(" [Chat Contract] Error saving model log: %v\n", err)
			} else {
				fmt.Printf(" [Chat Contract] Saved model log for UserID: %s\n", userID)
			}
		}
	}()

	return finalResult, nil
}
