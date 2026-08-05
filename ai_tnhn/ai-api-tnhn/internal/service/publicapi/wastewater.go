package publicapi

import (
	"ai-api-tnhn/internal/dto"
	"context"
	"time"
)

func (s *service) GetPublicWastewaterData(ctx context.Context, stationID string, dateUnix int64) ([]dto.PublicWastewaterData, error) {
	var results []dto.PublicWastewaterData
	start, end := parseTimeRange(dateUnix, false)

	records, err := s.wastewaterRepo.GetAllReports(ctx, stationID, start.Unix(), end.Unix())
	if err == nil {
		for _, r := range records {
			results = append(results, dto.PublicWastewaterData{
				FlowRate:  0,
				Timestamp: time.Unix(r.Timestamp, 0),
			})
		}
	}
	return results, nil
}
