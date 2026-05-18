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

// rainDayRange returns the start and end time for a "rain day".
// Rain day D runs from 7:00 AM D to 7:00 AM (D+1).
// For example, rain day "2026-02-18" = 7h 18/02 → 7h 19/02.
func rainDayRange(date string) (start, end time.Time) {
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	timeObj, _ := time.ParseInLocation("2006-01-02", date, loc)
	// Rain day D: from 7:00 AM of day D to 7:00 AM of day (D+1)
	start = time.Date(timeObj.Year(), timeObj.Month(), timeObj.Day(), 7, 0, 0, 0, loc)
	end = start.AddDate(0, 0, 1)
	return
}

// currentRainDay returns the "rain day" date string for the current moment.
// Before 7:00 AM, the current rain day is yesterday (cycle 7h yesterday → 7h today).
// At or after 7:00 AM, the current rain day is today (cycle 7h today → 7h tomorrow).
func currentRainDay() string {
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	now := time.Now().In(loc)
	cutoff := time.Date(now.Year(), now.Month(), now.Day(), 7, 0, 0, 0, loc)
	if now.Before(cutoff) {
		// Before 7:00 AM → belongs to yesterday's rain day (7h yesterday → 7h today)
		return now.AddDate(0, 0, -1).Format("2006-01-02")
	}
	// At or after 7:00 AM → belongs to today's rain day (7h today → 7h tomorrow)
	return now.Format("2006-01-02")
}

func (s *service) GetRainDataByStation(ctx context.Context, stationID int64, date string) ([]models.RainRecord, error) {
	if date == "" {
		date = currentRainDay()
	}
	isCurrentCycle := date == currentRainDay()

	var res []models.RainRecord

	if isCurrentCycle {
		// For the current rain cycle, fetch live data from external API
		// The external API uses the date to return data for 7h(D-1) → 7h(D)
		records, err := s.fetchFromExternal(ctx, stationID, date)
		if err == nil && len(records) > 0 {
			for _, r := range records {
				res = append(res, *r)
			}
		}
	} else {
		// For historical rain days, query DB with correct 7h window
		startTime, endTime := rainDayRange(date)

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
	// Use rain day range (7h D-1 → 7h D) instead of simple date string match
	startTime, endTime := rainDayRange(date)
	return s.rainRepo.GetByDateRange(ctx, startTime, endTime)
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
