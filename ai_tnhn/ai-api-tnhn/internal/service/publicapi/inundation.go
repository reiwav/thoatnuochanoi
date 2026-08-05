package publicapi

import (
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/models"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) GetPublicInundationData(ctx context.Context, stationID string, startUnix, endUnix int64) ([]dto.PublicInundationData, error) {
	maxSeconds := int64(365 * 24 * 3600)
	if endUnix-startUnix > maxSeconds {
		startUnix = endUnix - maxSeconds
	}

	var reports []*models.InundationReport
	fReport := bson.M{
		"point_id":    stationID,
		"has_flooded": true,
		"created_at":  bson.M{"$gte": startUnix, "$lte": endUnix},
	}
	err := s.inuReportRepo.R_SelectManyWithSort(ctx, fReport, bson.M{"created_at": -1}, &reports)
	if err != nil {
		return nil, err
	}

	var results []dto.PublicInundationData

	for _, report := range reports {
		var records []*models.InundationHistory
		fHistory := bson.M{
			"report_id": report.ID,
		}
		_ = s.inuHistoryRepo.R_SelectManyWithSort(ctx, fHistory, bson.M{"created_at": -1}, &records)

		status := "flooded"
		var endTime string
		if report.Status == "resolved" {
			endTime = time.Unix(report.MTime, 0).Format(time.RFC3339)
			status = "normal"
		}

		currentDepth := 0.0
		if len(records) > 0 {
			currentDepth = records[0].Depth // Because it's sorted descending
			if currentDepth > 0 && status == "normal" {
				status = "flooded"
			}
		}

		item := dto.PublicInundationData{
			Status:       status,
			CurrentDepth: currentDepth,
			MaxDepth:     report.MaxDepth,
			StartTime:    time.Unix(report.CTime, 0).Format(time.RFC3339),
			EndTime:      endTime,
			Length:       report.MaxLength,
			Width:        report.MaxWidth,
			Images:       report.Images,
			History:      []dto.InundationHistoryItem{},
		}

		for _, r := range records {
			item.History = append(item.History, dto.InundationHistoryItem{
				Time:   time.Unix(r.CTime, 0).Format(time.RFC3339),
				Depth:  r.Depth,
				Length: r.Length,
				Width:  r.Width,
				Images: r.Images,
				Note:   r.Note,
			})
		}

		results = append(results, item)
	}

	return results, nil
}
