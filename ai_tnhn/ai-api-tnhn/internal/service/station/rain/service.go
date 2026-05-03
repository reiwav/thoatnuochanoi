package rain

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type Service interface {
	GetRainDataByStation(ctx context.Context, stationID int64, date string) ([]models.RainRecord, error)
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

func (s *service) GetRainDataByStation(ctx context.Context, stationID int64, date string) ([]models.RainRecord, error) {
	timeObj, _ := time.Parse("2006-01-02", date)
	endTime := time.Date(timeObj.Year(), timeObj.Month(), timeObj.Day()+1, 7, 0, 0, 0, timeObj.Location())
	startTime := time.Date(timeObj.Year(), timeObj.Month(), timeObj.Day(), 7, 0, 0, 0, timeObj.Location())

	res, err := s.rainRepo.GetAllByStationID(ctx, stationID, startTime, endTime)
	if err != nil {
		return nil, err
	}
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")

	for i, item := range res {
		// 2. Chuyển đổi Timestamp sang múi giờ VN
		// Phương thức .In() sẽ tự động tính toán offset cho bạn
		item.Timestamp = item.Timestamp.In(loc)

		res[i] = item
	}
	return res, nil
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
