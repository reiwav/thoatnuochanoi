package publicapi

import (
	"ai-api-tnhn/internal/dto"
	"context"
	"time"
)

func (s *service) GetPublicSluiceGateData(ctx context.Context, stationID string, dateUnix int64) ([]dto.PublicSluiceGateData, error) {
	var results []dto.PublicSluiceGateData
	start, end := parseTimeRange(dateUnix, false)

	records, err := s.sluiceGateRepo.GetAllHistory(ctx, stationID, start.Unix(), end.Unix())
	if err == nil {
		for _, r := range records {
			results = append(results, dto.PublicSluiceGateData{
				IsOpen:    r.Action == "open",
				OpenLevel: 0,
				Timestamp: time.Unix(r.Timestamp, 0),
			})
		}
	}
	return results, nil
}
