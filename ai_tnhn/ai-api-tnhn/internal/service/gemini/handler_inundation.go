package gemini

import (
	"ai-api-tnhn/internal/service/googleapi"
	"context"
	"fmt"
	"time"

	"github.com/google/generative-ai-go/genai"
)

func (s *service) handleInundationTools(ctx context.Context, call *genai.FunctionCall, orgID string, assignedInuIDs []string) (interface{}, error) {
	switch call.Name {
	case "get_live_inundation_summary":
		summary, err := s.googleApiSvc.GetInundationSummary(ctx)
		if err != nil {
			return nil, err
		}
		if orgID != "all" {
			// Create a map for assigned points for O(1) lookup
			assignedMap := make(map[string]bool)
			for _, id := range assignedInuIDs {
				assignedMap[id] = true
			}

			reports, _, _ := s.inuSvc.ListReportsWithFilter(ctx, orgID, "active", "", "", assignedInuIDs, 0, 100)

			var filtered []googleapi.InundationPointStat
			for _, r := range reports {
				filtered = append(filtered, googleapi.InundationPointStat{
					StreetName:    r.StreetName,
					OrgName:       "", // Would need org mapping if desired
					Depth:         r.Depth,
					StartTime:     time.Unix(r.StartTime, 0).Format("15:04 02/01/2006"),
					Description:   r.Description,
					CurrentStatus: "Đang ngập lụt",
				})
			}
			return &googleapi.InundationSummaryData{
				ActivePoints:  len(filtered),
				OngoingPoints: filtered,
			}, nil
		}
		return summary, nil
	default:
		return nil, fmt.Errorf("unknown inundation tool: %s", call.Name)
	}
}
