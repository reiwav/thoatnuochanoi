package gemini

import (
	"context"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func (s *service) handlePumpingTools(ctx context.Context, call *genai.FunctionCall, orgID string, assignedIDs []string) (interface{}, error) {
	switch call.Name {
	case "get_live_pumping_summary":
		return s.pumpingSvc.GetPumpingStationSummary(ctx, orgID, assignedIDs)
	default:
		return nil, fmt.Errorf("unknown pumping tool: %s", call.Name)
	}
}
