package googleapi

import (
	pumpingstation "ai-api-tnhn/internal/service/pumping_station"
	"context"
)

func (s *service) GetPumpingStationSummary(ctx context.Context, orgID string, assignedIDs []string) (*pumpingstation.PumpingStationSummaryData, error) {
	return s.pumpingSvc.GetPumpingStationSummary(ctx, orgID, assignedIDs)
}
