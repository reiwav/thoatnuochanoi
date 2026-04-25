package googleapi

import (
	"ai-api-tnhn/internal/service/station/inundation"
	pumpingstation "ai-api-tnhn/internal/service/station/pumping_station"
	"ai-api-tnhn/internal/service/station/water"
	"ai-api-tnhn/internal/service/weather"
	"context"
)

func (s *service) GetRainSummary(ctx context.Context, orgID string, assignedIDs []string) (*weather.RainSummaryData, error) {
	return s.weatherSvc.GetRainSummary(ctx, orgID, assignedIDs)
}

func (s *service) GetWaterSummary(ctx context.Context, orgID string, assignedIDs []string) (*water.WaterSummaryData, error) {
	return s.waterSvc.GetWaterSummary(ctx, orgID, assignedIDs)
}

func (s *service) GetPumpingStationSummary(ctx context.Context, orgID string, assignedIDs []string) (*pumpingstation.PumpingStationSummaryData, error) {
	return s.pumpingSvc.GetPumpingStationSummary(ctx, orgID, assignedIDs)
}

func (s *service) GetInundationSummary(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string) (*inundation.InundationSummaryData, error) {
	return s.inuSvc.GetInundationSummary(ctx, orgID, isAllowedAll, assignedInuIDs)
}
