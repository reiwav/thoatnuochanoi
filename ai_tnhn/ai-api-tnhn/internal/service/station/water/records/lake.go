package records

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils"
	"ai-api-tnhn/utils/web"
	"context"
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
	station, err := s.stationSvc.GetLakeStationByOldID(ctx, int(record.StationID))
	if err == nil && station != nil {
		stationName = station.TenTram
		stationHexID = station.ID
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
		record.Timestamp = utils.NowVietnam()
	}
	if record.Date == "" {
		record.Date = utils.FormatDate(record.Timestamp)
	}
	if record.Source == "" {
		record.Source = "manual"
	}

	if station != nil && len(station.ThresholdConfigs) > 0 && s.waterThresholdSvc != nil {
		status, minVal, maxVal := s.waterThresholdSvc.CalculateThresholdStatus(ctx, record.Timestamp, station.ThresholdConfigs, record.Value)
		record.ThresholdStatus = status
		record.MinThreshold = minVal
		record.MaxThreshold = maxVal
	}

	err = s.lakeRepo.Create(ctx, record)
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
		if updateErr := s.stationSvc.UpdateLakeStation(ctx, station.ID, station); updateErr != nil {
			s.logger.GetLogger().Errorf("Failed to update latest record for lake station %d: %v", record.StationID, updateErr)
		}
	}

	return nil
}
