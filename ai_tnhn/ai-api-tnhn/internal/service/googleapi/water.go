package googleapi

import (
	"ai-api-tnhn/internal/service/water"
	"context"
)

func (s *service) GetWaterSummary(ctx context.Context, orgID string, assignedIDs []string) (*water.WaterSummaryData, error) {
	return s.waterSvc.GetWaterSummary(ctx, orgID, assignedIDs)
}
