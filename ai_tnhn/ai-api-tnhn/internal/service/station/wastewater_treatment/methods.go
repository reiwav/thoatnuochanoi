package wastewater_treatment

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"time"
)

func (s *service) Create(ctx context.Context, input *models.WastewaterStation) (*models.WastewaterStation, error) {
	return s.repo.Create(ctx, input)
}

func (s *service) Update(ctx context.Context, id string, input *models.WastewaterStation) error {
	return s.repo.Update(ctx, id, input)
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *service) GetByID(ctx context.Context, id string) (*models.WastewaterStation, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *service) List(ctx context.Context, f filter.Filter) ([]*models.WastewaterStation, int64, error) {
	return s.repo.List(ctx, f)
}

func (s *service) ListFiltered(ctx context.Context, orgID string, ids []string) ([]*models.WastewaterStation, error) {
	return s.repo.ListFiltered(ctx, orgID, ids)
}

func (s *service) SubmitReport(ctx context.Context, stationID string, userID string, userName string, note string) error {
	report := &models.WastewaterStationReport{
		StationID: stationID,
		UserID:    userID,
		UserName:  userName,
		Note:      note,
		Timestamp: time.Now().Unix(),
	}

	_, err := s.repo.CreateReport(ctx, report)
	if err != nil {
		return err
	}

	// Update LastReport in Station
	station, err := s.repo.GetByID(ctx, stationID)
	if err == nil && station != nil {
		station.LastReport = report
		return s.repo.Update(ctx, stationID, station)
	}

	return err
}

func (s *service) GetHistory(ctx context.Context, stationID string, f filter.Filter) ([]*models.WastewaterStationReport, int64, error) {
	f.AddWhere("station_id", "station_id", stationID)
	return s.repo.ListReports(ctx, f)
}
