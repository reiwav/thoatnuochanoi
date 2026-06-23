package water

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"time"
)

func (s *service) GetRiverDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error) {
	return s.riverRepo.GetByStationID(ctx, stationID, limit, date)
}

func (s *service) GetRiverDataByDate(ctx context.Context, date string) ([]*models.RiverRecord, error) {
	return s.riverRepo.GetByDate(ctx, date)
}

func (s *service) CreateRiverRecord(ctx context.Context, record *models.RiverRecord, user *models.User) error {
	var stationName string
	var stationHexID string
	f := filter.NewBasicFilter()
	f.AddWhere("old_id", "old_id", record.StationID)
	stations, _, err := s.stationSvc.ListRiverStations(ctx, f)
	if err == nil && len(stations) > 0 {
		stationName = stations[0].TenTram
		stationHexID = stations[0].ID
	}

	if user.IsEmployee && !user.IsCompany && user.Role != "super_admin" {
		assigned := false
		for _, id := range user.AssignedRiverStationIDs {
			if id == stationHexID {
				assigned = true
				break
			}
		}
		if !assigned {
			return web.Forbidden("Bạn không được gán trạm sông này để thực hiện báo cáo")
		}
	}

	record.StationName = stationName
	if record.Timestamp.IsZero() {
		record.Timestamp = time.Now()
	}
	if record.Date == "" {
		record.Date = record.Timestamp.Format("2006-01-02")
	}

	return s.riverRepo.Create(ctx, record)
}
