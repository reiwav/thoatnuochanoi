package publicapi

import (
	"ai-api-tnhn/internal/dto"
	"context"
)

func (s *service) GetPublicRainData(ctx context.Context, stationID string, dateUnix int64) ([]dto.PublicRainData, error) {
	var results []dto.PublicRainData
	st, err := s.rainStationRepo.GetByID(ctx, stationID)
	if err != nil || st == nil {
		return results, nil
	}
	oldID := int64(st.OldID)

	start, end := parseTimeRange(dateUnix, true)
	
	records, err := s.rainRepo.GetAllByStationID(ctx, oldID, start, end)
	
	if err == nil {
		for _, r := range records {
			results = append(results, dto.PublicRainData{
				Rain1H:    float64(r.Value),
				Timestamp: r.Timestamp,
			})
		}
	}

	return results, nil
}
