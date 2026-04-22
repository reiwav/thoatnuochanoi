package gemini

import (
	"context"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func (s *service) handleInundationTools(ctx context.Context, call *genai.FunctionCall, orgID string, isAllowedAll bool, assignedInuIDs []string) (interface{}, error) {
	switch call.Name {
	case "get_live_inundation_summary":
		return s.inuSvc.GetInundationSummary(ctx, orgID, isAllowedAll, assignedInuIDs)
	default:
		return nil, fmt.Errorf("unknown inundation tool: %s", call.Name)
	}
}
