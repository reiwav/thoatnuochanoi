package gemini

// Side channels around a chat turn: token accounting, conversation logging, and
// the standalone PDF extraction call.

import (
	"context"
	"fmt"
	"time"

	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/google/gemini/promt"

	"github.com/google/generative-ai-go/genai"
)

// skipLogSentinel in the logPrompt position suppresses chat logging, used by
// generated reports that would otherwise pollute a user's history.
const skipLogSentinel = "SKIP_LOG"

// ExtractTextFromPDF OCRs a PDF via Gemini and returns the plain text.
func (s *service) ExtractTextFromPDF(ctx context.Context, b []byte) (string, error) {
	cl := s.getClient()
	m := cl.GenerativeModel(constant.ModelAIVersion)
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

// recordUsage books token consumption for one model response. Fire-and-forget on
// a detached context: usage accounting must not fail or delay a reply.
func (s *service) recordUsage(ctx context.Context, u *genai.UsageMetadata) {
	if u == nil {
		return
	}
	go func() {
		_ = s.aiUsageRepo.Save(context.Background(), &models.AiUsage{
			ModelName:       constant.ModelAIVersion,
			PromptTokens:    int(u.PromptTokenCount),
			CandidateTokens: int(u.CandidatesTokenCount),
			TotalTokens:     int(u.TotalTokenCount),
			Timestamp:       time.Now(),
		})
	}()
}

// saveLog persists one question/answer pair to the user's chat history.
//
// displayPrompt, when set, is logged in place of the raw prompt so callers that
// send a machine-built prompt can record the human-readable question instead.
// The user row is backdated one second so history sorts question before answer.
func (s *service) saveLog(userID, rawPrompt, response, displayPrompt, chatType string) {
	if s.aiChatLogRepo == nil || displayPrompt == skipLogSentinel {
		return
	}

	content := rawPrompt
	if displayPrompt != "" {
		content = displayPrompt
	}

	now := time.Now()
	ctx := context.Background()
	_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{
		UserID: userID, Role: "user", Content: content, ChatType: chatType,
		Timestamp: now.Add(-1 * time.Second),
	})
	_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{
		UserID: userID, Role: "model", Content: response, ChatType: chatType,
		Timestamp: now,
	})
}
