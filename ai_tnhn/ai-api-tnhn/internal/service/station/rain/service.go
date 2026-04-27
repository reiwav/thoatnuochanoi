package rain

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/bson"
)

type Service interface {
	GetRainDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RainRecord, error)
	GetRainDataByDate(ctx context.Context, date string) ([]*models.RainRecord, error)
	GetRainAggregateStats(ctx context.Context, stationID int64, startDate, endDate string, groupBy string) ([]map[string]interface{}, error)
	GetRainChart(ctx context.Context, stationOldID int64, date string) ([]*models.RainRecord, error)
}

type service struct {
	rainRepo repository.Rain
}

func NewService(rainRepo repository.Rain) Service {
	return &service{
		rainRepo: rainRepo,
	}
}

func (s *service) GetRainDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RainRecord, error) {
	return s.rainRepo.GetByStationID(ctx, stationID, limit, date)
}

func (s *service) GetRainDataByDate(ctx context.Context, date string) ([]*models.RainRecord, error) {
	return s.rainRepo.GetByDate(ctx, date)
}

func (s *service) GetRainAggregateStats(ctx context.Context, stationID int64, startDate, endDate string, groupBy string) ([]map[string]interface{}, error) {
	filter := bson.M{}
	if stationID > 0 {
		filter["station_id"] = stationID
	}
	if startDate != "" || endDate != "" {
		dateFilter := bson.M{}
		if startDate != "" {
			dateFilter["$gte"] = startDate
		}
		if endDate != "" {
			dateFilter["$lte"] = endDate
		}
		filter["date"] = dateFilter
	}

	return s.rainRepo.GetAggregateStats(ctx, filter, groupBy)
}

func (s *service) GetRainChart(ctx context.Context, stationOldID int64, date string) ([]*models.RainRecord, error) {
	return s.rainRepo.GetByStationID(ctx, stationOldID, 1000, date)
}
