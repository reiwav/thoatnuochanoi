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

func (s *service) UpsertSingleWaterRecord(ctx context.Context, input *SingleWaterRecordInput, user *models.User) error {
	if input == nil || input.StationID <= 0 {
		return nil
	}

	itemTime := input.Timestamp
	if itemTime.IsZero() {
		itemTime = time.Now()
	}

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	dateStr := input.Date
	if dateStr == "" {
		dateStr = itemTime.In(loc).Format("2006-01-02")
	}

	if input.StationType == "river" {
		record := &models.RiverRecord{
			StationID: input.StationID,
			Timestamp: itemTime,
			Date:      dateStr,
			Value:     input.Value,
			Source:    "manual",
		}
		return s.CreateRiverRecord(ctx, record, user)
	}

	record := &models.LakeRecord{
		StationID: input.StationID,
		Timestamp: itemTime,
		Date:      dateStr,
		Value:     input.Value,
		Source:    "manual",
	}
	return s.CreateLakeRecord(ctx, record, user)
}

func (s *service) GetGridDataByTimeRange(ctx context.Context, startTime, endTime time.Time, date string) ([]GridDataResponseItem, error) {
	var result []GridDataResponseItem
	useRange := !startTime.IsZero() && !endTime.IsZero()

	var rivers []*models.RiverRecord
	var err error
	if useRange {
		rivers, err = s.riverRepo.GetByDateRange(ctx, startTime, endTime)
	} else if date != "" {
		rivers, err = s.riverRepo.GetByDate(ctx, date)
	}
	if err == nil && len(rivers) > 0 {
		for _, r := range rivers {
			result = append(result, GridDataResponseItem{
				StationType: "river",
				StationID:   r.StationID,
				Timestamp:   r.Timestamp,
				Value:       r.Value,
			})
		}
	}

	var lakes []*models.LakeRecord
	if useRange {
		lakes, err = s.lakeRepo.GetByDateRange(ctx, startTime, endTime)
	} else if date != "" {
		lakes, err = s.lakeRepo.GetByDate(ctx, date)
	}
	if err == nil && len(lakes) > 0 {
		for _, l := range lakes {
			result = append(result, GridDataResponseItem{
				StationType: "lake",
				StationID:   l.StationID,
				Timestamp:   l.Timestamp,
				Value:       l.Value,
			})
		}
	}

	return result, nil
}
