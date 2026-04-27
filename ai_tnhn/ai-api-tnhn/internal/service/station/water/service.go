package water

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/weather"
	"context"
)

type Service interface {
	GetLakeDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error)
	GetRiverDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error)
	GetLakeDataByDate(ctx context.Context, date string) ([]*models.LakeRecord, error)
	GetRiverDataByDate(ctx context.Context, date string) ([]*models.RiverRecord, error)

	// Summary for external consumers
	GetWaterSummary(ctx context.Context, orgID string, assignedIDs []string) (*WaterSummaryData, error)

}

type service struct {
	lakeRepo     repository.Lake
	riverRepo    repository.River
	stationSvc   station.Service
	weatherSvc   weather.Service
	logger       logger.Logger
}

func NewService(l logger.Logger, lake repository.Lake, river repository.River, stationSvc station.Service, weatherSvc weather.Service) Service {
	return &service{
		lakeRepo:   lake,
		riverRepo:  river,
		stationSvc: stationSvc,
		weatherSvc: weatherSvc,
		logger:     l,
	}
}
