package water

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/weather"
	"context"
)

type Service interface {
	GetRainDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RainRecord, error)
	GetLakeDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error)
	GetRiverDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error)
	GetRainDataByDate(ctx context.Context, date string) ([]*models.RainRecord, error)
	GetLakeDataByDate(ctx context.Context, date string) ([]*models.LakeRecord, error)
	GetRiverDataByDate(ctx context.Context, date string) ([]*models.RiverRecord, error)
	GetRainAggregateStats(ctx context.Context, stationID int64, startDate, endDate string, groupBy string) ([]map[string]interface{}, error)

	// Summary for external consumers
	GetWaterSummary(ctx context.Context, orgID string, assignedIDs []string) (*WaterSummaryData, error)
}

type service struct {
	rainRepo   repository.Rain
	lakeRepo   repository.Lake
	riverRepo  repository.River
	stationSvc station.Service
	weatherSvc weather.Service
}

func NewService(rain repository.Rain, lake repository.Lake, river repository.River, stationSvc station.Service, weatherSvc weather.Service) Service {
	return &service{
		rainRepo:   rain,
		lakeRepo:   lake,
		riverRepo:  river,
		stationSvc: stationSvc,
		weatherSvc: weatherSvc,
	}
}
