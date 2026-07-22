package water

import (
	"ai-api-tnhn/internal/models"
	"context"
	"time"
)

func (s *service) BatchUpsertWaterRecords(ctx context.Context, input *BatchWaterRecordInput, user *models.User) error {
	if input == nil || len(input.Records) == 0 {
		return nil
	}

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")

	for _, item := range input.Records {
		if item.StationID <= 0 {
			continue
		}

		itemTime := item.Timestamp
		if itemTime.IsZero() {
			itemTime = time.Now()
		}

		dateStr := itemTime.In(loc).Format("2006-01-02")

		if input.TargetType == "river" {
			record := &models.RiverRecord{
				StationID: item.StationID,
				Timestamp: itemTime,
				Date:      dateStr,
				Value:     item.Value,
				Source:    "manual",
			}
			if err := s.CreateRiverRecord(ctx, record, user); err != nil {
				s.logger.GetLogger().Errorf("[BatchUpsertWaterRecords] Failed for river station %d: %v", item.StationID, err)
			}
		} else {
			record := &models.LakeRecord{
				StationID: item.StationID,
				Timestamp: itemTime,
				Date:      dateStr,
				Value:     item.Value,
				Source:    "manual",
			}
			if err := s.CreateLakeRecord(ctx, record, user); err != nil {
				s.logger.GetLogger().Errorf("[BatchUpsertWaterRecords] Failed for lake station %d: %v", item.StationID, err)
			}
		}
	}

	return nil
}
