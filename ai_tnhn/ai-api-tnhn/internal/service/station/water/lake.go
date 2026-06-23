package water

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"time"
)

func (s *service) GetLakeDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error) {
	return s.lakeRepo.GetByStationID(ctx, stationID, limit, date)
}

func (s *service) GetLakeDataByDate(ctx context.Context, date string) ([]*models.LakeRecord, error) {
	return s.lakeRepo.GetByDate(ctx, date)
}

func (s *service) CreateLakeRecord(ctx context.Context, record *models.LakeRecord, user *models.User) error {
	var stationName string
	var stationHexID string
	f := filter.NewBasicFilter()
	f.AddWhere("old_id", "old_id", record.StationID)
	stations, _, err := s.stationSvc.ListLakeStations(ctx, f)
	if err == nil && len(stations) > 0 {
		stationName = stations[0].TenTram
		stationHexID = stations[0].ID
	}

	if user.IsEmployee && !user.IsCompany && user.Role != "super_admin" {
		assigned := false
		for _, id := range user.AssignedLakeStationIDs {
			if id == stationHexID {
				assigned = true
				break
			}
		}
		if !assigned {
			return web.Forbidden("Bạn không được gán trạm hồ này để thực hiện báo cáo")
		}
	}

	record.StationName = stationName
	if record.Timestamp.IsZero() {
		record.Timestamp = time.Now()
	}
	if record.Date == "" {
		record.Date = record.Timestamp.Format("2006-01-02")
	}

	return s.lakeRepo.Create(ctx, record)
}
