package publicapi

import (
	"ai-api-tnhn/internal/dto"
	"context"
)

func (s *service) GetPublicWaterData(ctx context.Context, stationType, stationID string, dateUnix int64) ([]dto.PublicWaterData, error) {
	var results []dto.PublicWaterData
	var oldID int64 = -1

	switch stationType {
	case "lake":
		st, err := s.lakeStationRepo.GetByID(ctx, stationID)
		if err == nil && st != nil {
			oldID = int64(st.OldID)
		}
	case "river":
		st, err := s.riverStationRepo.GetByID(ctx, stationID)
		if err == nil && st != nil {
			oldID = int64(st.OldID)
		}
	}

	if oldID == -1 {
		return results, nil // Station not found
	}

	start, end := parseTimeRange(dateUnix, false)

	switch stationType {
	case "lake":
		records, err := s.lakeRepo.GetAllByStationID(ctx, oldID, start, end)
		if err == nil {
			for _, r := range records {
				results = append(results, dto.PublicWaterData{
					CurrentLevel: float64(r.Value),
					Timestamp:    r.Timestamp,
					Status:       "normal", // can be mapped if needed
				})
			}
		}
	case "river":
		records, err := s.riverRepo.GetAllByStationID(ctx, oldID, start, end)
		if err == nil {
			for _, r := range records {
				results = append(results, dto.PublicWaterData{
					CurrentLevel: float64(r.Value),
					Timestamp:    r.Timestamp,
					Status:       "normal",
				})
			}
		}
	}

	return results, nil
}
