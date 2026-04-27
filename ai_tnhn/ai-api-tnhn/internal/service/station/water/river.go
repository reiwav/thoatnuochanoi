package water

import (
	"ai-api-tnhn/internal/models"
	"context"
)

func (s *service) GetRiverDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error) {
	return s.riverRepo.GetByStationID(ctx, stationID, limit, date)
}

func (s *service) GetRiverDataByDate(ctx context.Context, date string) ([]*models.RiverRecord, error) {
	return s.riverRepo.GetByDate(ctx, date)
}
