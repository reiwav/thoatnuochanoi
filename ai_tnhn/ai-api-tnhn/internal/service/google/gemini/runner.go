package gemini

// The shared tool-calling loop behind both chat entry points.
//
// Chat and ChatContract differ only in which client pool they draw from, which
// system instruction and tool set they present, how tool results are mapped
// into frontend tables, and the chat_type they log under. Everything else - the
// multi-turn function-call loop, parallel tool dispatch, payload truncation,
// usage accounting and the empty-answer fallbacks - lives here once.

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"runtime/debug"
	"strings"
	"sync"
	"unicode/utf8"

	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/service/google/googleapi"

	"github.com/google/generative-ai-go/genai"
	"golang.org/x/sync/errgroup"
)

// maxToolResultBytes caps how much of a single tool result is handed back to the
// model. Large station dumps would otherwise blow the context window.
const maxToolResultBytes = 30000

// chatSession is the per-flow configuration for runChat.
type chatSession struct {
	// client is the Gemini client drawn from the flow's round-robin pool.
	client *genai.Client
	// systemPrompt is the system instruction for the flow.
	systemPrompt string
	// tools is the function-declaration set exposed to the model.
	tools []*genai.FunctionDeclaration
	// dispatch executes one tool call.
	dispatch func(ctx context.Context, c *genai.FunctionCall) (interface{}, error)
	// mapTable folds a successful tool result into the frontend table set.
	mapTable func(tables map[string]interface{}, c *genai.FunctionCall, res interface{})
}

// runChat drives the model until it stops asking for tools, then assembles the
// reply. Tool calls within a single turn run in parallel.
func (s *service) runChat(ctx context.Context, cs chatSession, augmentedPrompt string) (*googleapi.ChatResponse, error) {
	m := cs.client.GenerativeModel(constant.ModelAIVersion)
	m.SystemInstruction = &genai.Content{Parts: []genai.Part{genai.Text(cs.systemPrompt)}}
	m.Tools = []*genai.Tool{{FunctionDeclarations: cs.tools}}

	sess := m.StartChat()
	resp, err := sess.SendMessage(ctx, genai.Text(augmentedPrompt))
	if err != nil {
		return nil, err
	}
	s.recordUsage(ctx, resp.UsageMetadata)

	tables := make(map[string]interface{})

	for {
		calls := functionCalls(resp)
		if len(calls) == 0 {
			break
		}

		var (
			toolResponses []genai.Part
			mu            sync.Mutex
		)
		g, gCtx := errgroup.WithContext(ctx)
		for _, c := range calls {
			g.Go(func() error {
				res, toolErr := safeDispatch(gCtx, cs.dispatch, c)

				mu.Lock()
				defer mu.Unlock()

				if toolErr != nil {
					toolResponses = append(toolResponses, genai.FunctionResponse{
						Name:     c.Name,
						Response: map[string]interface{}{"error": toolErr.Error()},
					})
					return nil
				}

				if res != nil {
					cs.mapTable(tables, c, res)
				}
				jb, _ := json.Marshal(res)
				toolResponses = append(toolResponses, genai.FunctionResponse{
					Name:     c.Name,
					Response: map[string]interface{}{"result": truncateForModel(string(jb), maxToolResultBytes)},
				})
				return nil
			})
		}
		// Tool errors are reported back to the model as function responses rather
		// than aborting the turn, so the goroutines never return a non-nil error.
		_ = g.Wait()

		resp, err = sess.SendMessage(ctx, toolResponses...)
		if err != nil {
			return nil, err
		}
		s.recordUsage(ctx, resp.UsageMetadata)
	}

	return &googleapi.ChatResponse{
		Text:   answerText(resp, len(tables) > 0),
		Tables: tables,
	}, nil
}

// safeDispatch runs a tool call and converts a panic into an ordinary error.
//
// Tool handlers work on model-supplied arguments, and they run inside errgroup
// goroutines. An unrecovered panic there would kill the whole process rather
// than fail one request, so it is contained and reported back to the model,
// which can then correct its arguments or explain the failure.
func safeDispatch(
	ctx context.Context,
	dispatch func(context.Context, *genai.FunctionCall) (interface{}, error),
	c *genai.FunctionCall,
) (res interface{}, err error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Chat] PANIC in tool %s: %v\n%s", c.Name, r, debug.Stack())
			res = nil
			err = fmt.Errorf("công cụ '%s' gặp lỗi nội bộ, không thể lấy dữ liệu", c.Name)
		}
	}()
	return dispatch(ctx, c)
}

// functionCalls extracts the tool calls from a response, if any.
func functionCalls(resp *genai.GenerateContentResponse) []*genai.FunctionCall {
	if resp == nil || len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil
	}
	var calls []*genai.FunctionCall
	for _, p := range resp.Candidates[0].Content.Parts {
		if c, ok := p.(genai.FunctionCall); ok {
			calls = append(calls, &c)
		}
	}
	return calls
}

// answerText concatenates the model's final parts, falling back to a canned
// sentence when the model returns tables with no prose, or nothing at all.
func answerText(resp *genai.GenerateContentResponse, hasTables bool) string {
	var b strings.Builder
	if resp != nil && len(resp.Candidates) > 0 && resp.Candidates[0].Content != nil {
		for _, p := range resp.Candidates[0].Content.Parts {
			fmt.Fprintf(&b, "%v", p)
		}
	}

	if text := strings.TrimSpace(b.String()); text != "" {
		return text
	}
	if hasTables {
		return "Dưới đây là thông tin chi tiết được phản hồi từ hệ thống:"
	}
	return "Hiện tại hệ thống không ghi nhận dữ liệu nào phù hợp với yêu cầu của bạn."
}

// truncateForModel clips s to at most max bytes without splitting a UTF-8 rune.
// Cutting mid-rune would hand the model invalid UTF-8, which matters here
// because tool results are full of Vietnamese station names.
func truncateForModel(s string, max int) string {
	if len(s) <= max {
		return s
	}
	cut := max
	for cut > 0 && !utf8.RuneStart(s[cut]) {
		cut--
	}
	return s[:cut] + "... (truncated)"
}
