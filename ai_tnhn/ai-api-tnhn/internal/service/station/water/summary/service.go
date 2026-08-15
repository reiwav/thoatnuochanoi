package summary

import (
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/setting"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/station/water/dto"
	"context"
)

// Service defines operations for generating water level summary reports
type Service interface {
	GetWaterSummary(ctx context.Context, orgID string, assignedIDs []string) (*dto.WaterSummaryData, error)
	GetWaterSummaryV2(ctx context.Context) ([]dto.WaterStationV2, error)
}

type service struct {
	lakeRepo          repository.Lake
	riverRepo         repository.River
	stationSvc        station.Service
	waterThresholdSvc setting.WaterThresholdService
}

// NewService constructs a new summary service instance
func NewService(
	lake repository.Lake,
	river repository.River,
	stationSvc station.Service,
	waterThresholdSvc setting.WaterThresholdService,
) Service {
	return &service{
		lakeRepo:          lake,
		riverRepo:         river,
		stationSvc:        stationSvc,
		waterThresholdSvc: waterThresholdSvc,
	}
}
