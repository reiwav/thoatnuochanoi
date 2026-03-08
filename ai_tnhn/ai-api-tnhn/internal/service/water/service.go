package water

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/bson"
)

type Service interface {
	GetRainDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RainRecord, error)
	GetLakeDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error)
	GetRiverDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error)
	GetRainDataByDate(ctx context.Context, date string) ([]*models.RainRecord, error)
	GetLakeDataByDate(ctx context.Context, date string) ([]*models.LakeRecord, error)
	GetRiverDataByDate(ctx context.Context, date string) ([]*models.RiverRecord, error)
	GetRainAggregateStats(ctx context.Context, stationID int64, startDate, endDate string, groupBy string) ([]map[string]interface{}, error)
}

type service struct {
	rainRepo  repository.Rain
	lakeRepo  repository.Lake
	riverRepo repository.River
}

func NewService(rain repository.Rain, lake repository.Lake, river repository.River) Service {
	return &service{
		rainRepo:  rain,
		lakeRepo:  lake,
		riverRepo: river,
	}
}

func (s *service) GetRainDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RainRecord, error) {
	return s.rainRepo.GetByStationID(ctx, stationID, limit, date)
}

func (s *service) GetLakeDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error) {
	return s.lakeRepo.GetByStationID(ctx, stationID, limit, date)
}

func (s *service) GetRiverDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error) {
	return s.riverRepo.GetByStationID(ctx, stationID, limit, date)
}

func (s *service) GetRainDataByDate(ctx context.Context, date string) ([]*models.RainRecord, error) {
	return s.rainRepo.GetByDate(ctx, date)
}

func (s *service) GetLakeDataByDate(ctx context.Context, date string) ([]*models.LakeRecord, error) {
	return s.lakeRepo.GetByDate(ctx, date)
}

func (s *service) GetRiverDataByDate(ctx context.Context, date string) ([]*models.RiverRecord, error) {
	return s.riverRepo.GetByDate(ctx, date)
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
