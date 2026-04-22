package googleapi

import (
	"ai-api-tnhn/internal/service/weather"
	"context"
)

func (s *service) GetRainSummary(ctx context.Context, orgID string, assignedIDs []string) (*weather.RainSummaryData, error) {
	return s.weatherSvc.GetRainSummary(ctx, orgID, assignedIDs)
}
