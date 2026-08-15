package grid

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/station/water/dto"
	"ai-api-tnhn/utils"
	"context"
	"time"
)

func (s *service) UpsertSingleWaterRecord(ctx context.Context, input *dto.SingleWaterRecordInput, user *models.User) (string, error) {
	if input == nil || input.StationID <= 0 {
		return "", nil
	}

	itemTime := input.Timestamp
	if itemTime.IsZero() {
		itemTime = utils.NowVietnam()
	}
	itemTime = itemTime.Truncate(time.Second)

	dateStr := input.Date
	if dateStr == "" {
		dateStr = utils.FormatDate(itemTime)
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
		err := s.recordsSvc.CreateRiverRecord(ctx, record, user)
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
	err := s.recordsSvc.CreateLakeRecord(ctx, record, user)
	if err != nil {
		return "", err
	}
	return record.ID, nil
}

func (s *service) GetGridDataByTimeRange(ctx context.Context, startTime, endTime time.Time, date string) ([]dto.GridDataResponseItem, error) {
	var result []dto.GridDataResponseItem
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
			result = append(result, dto.GridDataResponseItem{
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
			result = append(result, dto.GridDataResponseItem{
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
