package water

import (
	"ai-api-tnhn/internal/models"
	"context"
	"time"
)

func (s *service) UpsertSingleWaterRecord(ctx context.Context, input *SingleWaterRecordInput, user *models.User) (string, error) {
	if input == nil || input.StationID <= 0 {
		return "", nil
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
		if input.RecordID != "" {
			err := s.riverRepo.UpdateValueByID(ctx, input.RecordID, input.Value, "manual")
			return input.RecordID, err
		}

		record := &models.RiverRecord{
			StationID: input.StationID,
			Timestamp: itemTime,
			Date:      dateStr,
			Value:     input.Value,
			Source:    "manual",
		}
		err := s.CreateRiverRecord(ctx, record, user)
		if err != nil {
			return "", err
		}
		return record.ID, nil
	}

	if input.RecordID != "" {
		err := s.lakeRepo.UpdateValueByID(ctx, input.RecordID, input.Value, "manual")
		return input.RecordID, err
	}

	record := &models.LakeRecord{
		StationID: input.StationID,
		Timestamp: itemTime,
		Date:      dateStr,
		Value:     input.Value,
		Source:    "manual",
	}
	err := s.CreateLakeRecord(ctx, record, user)
	if err != nil {
		return "", err
	}
	return record.ID, nil
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
				RecordID:    r.ID,
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
				RecordID:    l.ID,
				StationType: "lake",
				StationID:   l.StationID,
				Timestamp:   l.Timestamp,
				Value:       l.Value,
			})
		}
	}

	return result, nil
}
