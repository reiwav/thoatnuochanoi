package gemini

import (
	"context"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func (s *service) handleGoogleTools(ctx context.Context, call *genai.FunctionCall) (interface{}, error) {
	switch call.Name {
	case "get_google_status":
		return s.googleApiSvc.GetStatus(ctx)
	case "read_email_by_title":
		title, _ := call.Args["title"].(string)
		return s.googleApiSvc.ReadEmailByTitle(ctx, title)
	case "read_email_by_id":
		id, _ := call.Args["id"].(float64)
		return s.googleApiSvc.ReadEmailByID(ctx, uint32(id))
	default:
		return nil, fmt.Errorf("unknown google tool: %s", call.Name)
	}
}
