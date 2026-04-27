package gemini

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/google/gemini/promt"
	"ai-api-tnhn/internal/service/google/googleapi"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/generative-ai-go/genai"
	"golang.org/x/sync/errgroup"
)

func (s *service) getClient() *genai.Client {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.clients[s.roundRobinIdx]
	s.roundRobinIdx = (s.roundRobinIdx + 1) % len(s.clients)
	return c
}

func (s *service) getContractClient() *genai.Client {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.contractClients[s.contractRoundRobinIdx]
	s.contractRoundRobinIdx = (s.contractRoundRobinIdx + 1) % len(s.contractClients)
	return c
}

func (s *service) Chat(ctx context.Context, prompt string, history []googleapi.ChatMessage, userID string, isCompany bool, logPrompt string) (string, error) {
	raw, aug := prompt, prompt
	if strings.Contains(strings.ToLower(prompt), "mưa") && (strings.Contains(strings.ToLower(prompt), "3 ngày trước") || strings.Contains(strings.ToLower(prompt), "ba ngày trước")) {
		dStr := time.Now().AddDate(0, 0, -3).Format("2006-01-02")
		if data, err := s.rainSvc.GetRainDataByDate(ctx, dStr); err == nil {
			dj, _ := json.Marshal(data)
			aug = fmt.Sprintf("[Hệ thống context]: Lượng mưa thực tế %s: %s\n\n[Câu hỏi]: %s", dStr, string(dj), prompt)
		}
	} else {
		aug = fmt.Sprintf("[Hệ thống]: %s\n\n[Câu hỏi]: %s", time.Now().Format("2006-01-02 15:04:05"), prompt)
	}

	cl := s.getClient()
	m := cl.GenerativeModel("gemini-2.5-flash")
	m.SystemInstruction = &genai.Content{Parts: []genai.Part{genai.Text(promt.Get("chat_system"))}}
	m.Tools = []*genai.Tool{{FunctionDeclarations: s.getChatTools()}}
	sess := m.StartChat()
	resp, err := sess.SendMessage(ctx, genai.Text(aug))
	if err != nil {
		return "", err
	}
	s.recordUsage(ctx, resp.UsageMetadata)

	for {
		if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
			break
		}
		var calls []*genai.FunctionCall
		for _, p := range resp.Candidates[0].Content.Parts {
			if c, ok := p.(genai.FunctionCall); ok {
				calls = append(calls, &c)
			}
		}
		if len(calls) == 0 {
			break
		}
		var trs []genai.Part
		var mu sync.Mutex
		g, gCtx := errgroup.WithContext(ctx)
		for _, c := range calls {
			c := c
			g.Go(func() error {
				res, te := s.handleToolCall(gCtx, c, userID, isCompany)
				mu.Lock()
				defer mu.Unlock()
				if te != nil {
					trs = append(trs, genai.FunctionResponse{Name: c.Name, Response: map[string]interface{}{"error": te.Error()}})
				} else {
					jb, _ := json.Marshal(res)
					rs := string(jb)
					if len(rs) > 30000 {
						rs = rs[:30000] + "... (truncated)"
					}
					trs = append(trs, genai.FunctionResponse{Name: c.Name, Response: map[string]interface{}{"result": rs}})
				}
				return nil
			})
		}
		_ = g.Wait()
		resp, err = sess.SendMessage(ctx, trs...)
		if err != nil {
			return "", err
		}
		s.recordUsage(ctx, resp.UsageMetadata)
	}
	fr := ""
	for _, p := range resp.Candidates[0].Content.Parts {
		fr += fmt.Sprintf("%v", p)
	}
	go s.saveLog(userID, raw, fr, logPrompt, "support")
	return fr, nil
}

func (s *service) ChatContract(ctx context.Context, prompt string, history []googleapi.ChatMessage, userID string, isCompany bool, logPrompt string) (string, error) {
	raw := prompt
	cl := s.getContractClient()
	m := cl.GenerativeModel("gemini-2.5-flash")
	m.SystemInstruction = &genai.Content{Parts: []genai.Part{genai.Text(promt.Get("contract_system"))}}
	m.Tools = []*genai.Tool{{FunctionDeclarations: s.getContractTools()}}
	aug := fmt.Sprintf("[Hệ thống]: %s\n\n[Câu hỏi]: %s", time.Now().Format("2006-01-02 15:04:05"), prompt)
	sess := m.StartChat()
	resp, err := sess.SendMessage(ctx, genai.Text(aug))
	if err != nil {
		return "", err
	}
	s.recordUsage(ctx, resp.UsageMetadata)

	for {
		if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
			break
		}
		var calls []*genai.FunctionCall
		for _, p := range resp.Candidates[0].Content.Parts {
			if c, ok := p.(genai.FunctionCall); ok {
				calls = append(calls, &c)
			}
		}
		if len(calls) == 0 {
			break
		}
		var trs []genai.Part
		var mu sync.Mutex
		g, gCtx := errgroup.WithContext(ctx)
		for _, c := range calls {
			c := c
			g.Go(func() error {
				res, te := s.handleContractToolCall(gCtx, c)
				mu.Lock()
				defer mu.Unlock()
				if te != nil {
					trs = append(trs, genai.FunctionResponse{Name: c.Name, Response: map[string]interface{}{"error": te.Error()}})
				} else {
					jb, _ := json.Marshal(res)
					rs := string(jb)
					if len(rs) > 30000 {
						rs = rs[:30000] + "... (truncated)"
					}
					trs = append(trs, genai.FunctionResponse{Name: c.Name, Response: map[string]interface{}{"result": rs}})
				}
				return nil
			})
		}
		_ = g.Wait()
		resp, err = sess.SendMessage(ctx, trs...)
		if err != nil {
			return "", err
		}
		s.recordUsage(ctx, resp.UsageMetadata)
	}
	fr := ""
	for _, p := range resp.Candidates[0].Content.Parts {
		fr += fmt.Sprintf("%v", p)
	}
	go s.saveLog(userID, raw, fr, logPrompt, "contract")
	return fr, nil
}

func (s *service) ExtractTextFromPDF(ctx context.Context, b []byte) (string, error) {
	cl := s.getClient()
	m := cl.GenerativeModel("gemini-2.5-flash")
	resp, err := m.GenerateContent(ctx, genai.Blob{MIMEType: "application/pdf", Data: b}, genai.Text(promt.Get("pdf_extraction")))
	if err != nil {
		return "", err
	}
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content generated")
	}
	res := ""
	for _, p := range resp.Candidates[0].Content.Parts {
		res += fmt.Sprintf("%v", p)
	}
	return res, nil
}

func (s *service) recordUsage(ctx context.Context, u *genai.UsageMetadata) {
	if u == nil {
		return
	}
	go func() {
		_ = s.aiUsageRepo.Save(context.Background(), &models.AiUsage{ModelName: "gemini-2.5-flash", PromptTokens: int(u.PromptTokenCount), CandidateTokens: int(u.CandidatesTokenCount), TotalTokens: int(u.TotalTokenCount), Timestamp: time.Now()})
	}()
}

func (s *service) saveLog(uID, raw, res, lp, cT string) {
	if s.aiChatLogRepo == nil || lp == "SKIP_LOG" {
		return
	}
	c := raw
	if lp != "" {
		c = lp
	}
	now := time.Now()
	ctx := context.Background()
	_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{UserID: uID, Role: "user", Content: c, ChatType: cT, Timestamp: now.Add(-1 * time.Second)})
	_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{UserID: uID, Role: "model", Content: res, ChatType: cT, Timestamp: now})
}
