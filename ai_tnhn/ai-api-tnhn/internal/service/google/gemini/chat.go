package gemini

// The two public chat entry points. Both are thin: they pick a client, build the
// augmented prompt, and hand the flow-specific pieces to runChat.

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"ai-api-tnhn/internal/service/google/gemini/promt"
	"ai-api-tnhn/internal/service/google/googleapi"

	"github.com/google/generative-ai-go/genai"
)

// getClient hands out operational-chat clients round-robin across the API keys.
func (s *service) getClient() *genai.Client {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.clients[s.roundRobinIdx]
	s.roundRobinIdx = (s.roundRobinIdx + 1) % len(s.clients)
	return c
}

// getContractClient does the same for the contract-chat key pool, which is
// billed separately.
func (s *service) getContractClient() *genai.Client {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.contractClients[s.contractRoundRobinIdx]
	s.contractRoundRobinIdx = (s.contractRoundRobinIdx + 1) % len(s.contractClients)
	return c
}

// Chat answers an operational question, calling drainage-system tools as needed.
//
// history is accepted for API compatibility but not yet forwarded to the model;
// see TODO(B5).
func (s *service) Chat(ctx context.Context, prompt string, history []googleapi.ChatMessage, userID string, isCompany bool, logPrompt string) (*googleapi.ChatResponse, error) {
	// The user's data scope is resolved at most once, and only if the model
	// actually calls a tool, so a pure-text answer costs no user lookup.
	scope := sync.OnceValue(func() dataScope { return s.resolveScope(ctx, userID, isCompany) })

	res, err := s.runChat(ctx, chatSession{
		client:       s.getClient(),
		systemPrompt: promt.Get("chat_system") + "\n\n" + promt.Get("database_schema"),
		tools:        s.getChatTools(),
		dispatch: func(ctx context.Context, c *genai.FunctionCall) (interface{}, error) {
			return s.handleToolCall(ctx, c, scope())
		},
		mapTable: s.mapChatTable,
	}, s.augmentChatPrompt(ctx, prompt))
	if err != nil {
		return nil, err
	}

	resBytes, _ := json.Marshal(res)
	go s.saveLog(userID, prompt, string(resBytes), logPrompt, "support")
	return res, nil
}

// ChatContract answers a contract question against the contract tool set.
//
// history is accepted for API compatibility but not yet forwarded to the model;
// see TODO(B5).
func (s *service) ChatContract(ctx context.Context, prompt string, history []googleapi.ChatMessage, userID string, isCompany bool, logPrompt string) (*googleapi.ChatResponse, error) {
	res, err := s.runChat(ctx, chatSession{
		client:       s.getContractClient(),
		systemPrompt: promt.Get("contract_system"),
		tools:        s.getContractTools(),
		dispatch:     s.handleContractToolCall,
		mapTable:     s.mapContractTable,
	}, withSystemTimestamp(prompt))
	if err != nil {
		return nil, err
	}

	resBytes, _ := json.Marshal(res)
	go s.saveLog(userID, prompt, string(resBytes), logPrompt, "contract")
	return res, nil
}

// augmentChatPrompt prefixes the question with the context the model needs.
//
// Asking about rain "3 days ago" is common enough that the figures are fetched
// up front instead of relying on the model to call a tool for them; every other
// question just gets the current timestamp so relative dates resolve correctly.
func (s *service) augmentChatPrompt(ctx context.Context, prompt string) string {
	if !mentionsRainThreeDaysAgo(prompt) {
		return withSystemTimestamp(prompt)
	}

	day := time.Now().AddDate(0, 0, -3).Format("2006-01-02")
	data, err := s.rainSvc.GetRainDataByDate(ctx, day)
	if err != nil {
		// Fall through to the plain prompt; the model can still call a tool.
		return withSystemTimestamp(prompt)
	}
	dj, _ := json.Marshal(data)
	return fmt.Sprintf("[Hệ thống context]: Lượng mưa thực tế %s: %s\n\n[Câu hỏi]: %s", day, string(dj), prompt)
}

func mentionsRainThreeDaysAgo(prompt string) bool {
	p := strings.ToLower(prompt)
	return strings.Contains(p, "mưa") &&
		(strings.Contains(p, "3 ngày trước") || strings.Contains(p, "ba ngày trước"))
}

func withSystemTimestamp(prompt string) string {
	return fmt.Sprintf("[Hệ thống]: %s\n\n[Câu hỏi]: %s", time.Now().Format("2006-01-02 15:04:05"), prompt)
}
