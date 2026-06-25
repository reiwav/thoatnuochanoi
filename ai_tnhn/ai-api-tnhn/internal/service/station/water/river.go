package water

import (
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
	station, err := s.stationSvc.GetRiverStationByOldID(ctx, int(record.StationID))
	if err == nil && station != nil {
		stationName = station.TenTram
		stationHexID = station.ID
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

	err = s.riverRepo.Create(ctx, record)
	if err != nil {
		return err
	}

	if station != nil {
		station.LatestRecord = &models.LatestWaterRecord{
			RecordID:    record.ID,
			StationID:   record.StationID,
			StationName: record.StationName,
			Value:       record.Value,
			Timestamp:   record.Timestamp,
			Date:        record.Date,
		}
		if updateErr := s.stationSvc.UpdateRiverStation(ctx, station.ID, station); updateErr != nil {
			s.logger.GetLogger().Errorf("Failed to update latest record for river station %d: %v", record.StationID, updateErr)
		}
	}

	return nil
}
