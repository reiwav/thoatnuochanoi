package gemini

import (
	"context"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func (s *service) handleQueryTools(ctx context.Context, call *genai.FunctionCall) (interface{}, error) {
	switch call.Name {
	case "database_query":
		coll, _ := call.Args["collection"].(string)
		filter, _ := call.Args["filter"].(map[string]interface{})
		return s.querySvc.Query(ctx, coll, filter, 0)
	default:
		return nil, fmt.Errorf("unknown query tool: %s", call.Name)
	}
}
