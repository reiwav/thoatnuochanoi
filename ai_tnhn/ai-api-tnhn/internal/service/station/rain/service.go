package rain

import (
	"ai-api-tnhn/internal/integration/thoatnuoc"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/setting"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type Service interface {
	GetRainDataByStation(ctx context.Context, stationID int64, date string) ([]models.RainRecord, error)
	GetRainDataByDate(ctx context.Context, date string) ([]*models.RainRecord, error)
	GetRainAggregateStats(ctx context.Context, stationID int64, startDate, endDate string, groupBy string) ([]map[string]interface{}, error)
	GetRainChart(ctx context.Context, stationOldID int64, date string) ([]models.RainRecord, error)
}

type service struct {
	rainRepo     repository.Rain
	thoatnuocSvc thoatnuoc.Service
	settingSvc   setting.Service
}

func NewService(rainRepo repository.Rain, thoatnuocSvc thoatnuoc.Service, settingSvc setting.Service) Service {
	return &service{
		rainRepo:     rainRepo,
		thoatnuocSvc: thoatnuocSvc,
		settingSvc:   settingSvc,
	}
}

func (s *service) GetRainDataByStation(ctx context.Context, stationID int64, date string) ([]models.RainRecord, error) {
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	isToday := date == time.Now().Format("2006-01-02")

	var res []models.RainRecord

	if isToday {
		records, err := s.fetchFromExternal(ctx, stationID, date)
		if err == nil && len(records) > 0 {
			for _, r := range records {
				res = append(res, *r)
			}
		}
	} else {
		timeObj, _ := time.Parse("2006-01-02", date)
		endTime := time.Date(timeObj.Year(), timeObj.Month(), timeObj.Day()+1, 7, 0, 0, 0, timeObj.Location())
		startTime := time.Date(timeObj.Year(), timeObj.Month(), timeObj.Day(), 7, 0, 0, 0, timeObj.Location())

		dbRes, err := s.rainRepo.GetAllByStationID(ctx, stationID, startTime, endTime)
		if err != nil {
			return nil, err
		}
		res = dbRes

		if len(res) == 0 {
			records, err := s.fetchFromExternal(ctx, stationID, date)
			if err == nil && len(records) > 0 {
				for _, r := range records {
					res = append(res, *r)
				}
			}
		}
	}

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")

	for i, item := range res {
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

func (s *service) GetRainChart(ctx context.Context, stationOldID int64, date string) ([]models.RainRecord, error) {
	records, err := s.GetRainDataByStation(ctx, stationOldID, date)
	if err != nil {
		return nil, err
	}

	return records, nil
}

func (s *service) fetchFromExternal(ctx context.Context, stationOldID int64, date string) ([]*models.RainRecord, error) {
	sessionID := "kzela2aw0gdvzxvrthicl14n" // Default session ID
	st, _ := s.settingSvc.GetRainSetting(ctx)
	if st != nil && st.SessionID != "" {
		sessionID = st.SessionID
	}

	dataPoints, err := s.thoatnuocSvc.GetRainChartData(ctx, sessionID, int(stationOldID), date)
	if err != nil {
		return nil, err
	}

	var res []*models.RainRecord
	for _, dp := range dataPoints {
		ts, err := time.ParseInLocation("2006-01-02T15:04:05", dp.ThoiGian, time.Local)
		if err != nil {
			continue
		}
		res = append(res, &models.RainRecord{
			StationID: stationOldID,
			Date:      ts.Format("2006-01-02"),
			Timestamp: ts,
			Value:     dp.LuongMua,
		})
	}
	return res, nil
}
