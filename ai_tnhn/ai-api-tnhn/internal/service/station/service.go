package station

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

type Service interface {
	// Rain Station
	CreateRainStation(ctx context.Context, input *models.RainStation) (*models.RainStation, error)
	GetRainStation(ctx context.Context, id string) (*models.RainStation, error)
	UpdateRainStation(ctx context.Context, id string, input *models.RainStation) error
	DeleteRainStation(ctx context.Context, id string) error
	ListRainStations(ctx context.Context, filter filter.Filter) ([]*models.RainStation, int64, error)

	// Lake Station
	CreateLakeStation(ctx context.Context, input *models.LakeStation) (*models.LakeStation, error)
	GetLakeStation(ctx context.Context, id string) (*models.LakeStation, error)
	UpdateLakeStation(ctx context.Context, id string, input *models.LakeStation) error
	DeleteLakeStation(ctx context.Context, id string) error
	ListLakeStations(ctx context.Context, filter filter.Filter) ([]*models.LakeStation, int64, error)

	// River Station
	CreateRiverStation(ctx context.Context, input *models.RiverStation) (*models.RiverStation, error)
	GetRiverStation(ctx context.Context, id string) (*models.RiverStation, error)
	UpdateRiverStation(ctx context.Context, id string, input *models.RiverStation) error
	DeleteRiverStation(ctx context.Context, id string) error
	ListRiverStations(ctx context.Context, filter filter.Filter) ([]*models.RiverStation, int64, error)
}

type service struct {
	rainRepo  repository.RainStation
	lakeRepo  repository.LakeStation
	riverRepo repository.RiverStation
}

func NewService(rain repository.RainStation, lake repository.LakeStation, river repository.RiverStation) Service {
	return &service{
		rainRepo:  rain,
		lakeRepo:  lake,
		riverRepo: river,
	}
}

// Rain Station Implementation
func (s *service) CreateRainStation(ctx context.Context, input *models.RainStation) (*models.RainStation, error) {
	return s.rainRepo.Create(ctx, input)
}
func (s *service) GetRainStation(ctx context.Context, id string) (*models.RainStation, error) {
	return s.rainRepo.GetByID(ctx, id)
}
func (s *service) UpdateRainStation(ctx context.Context, id string, input *models.RainStation) error {
	return s.rainRepo.Update(ctx, id, input)
}
func (s *service) DeleteRainStation(ctx context.Context, id string) error {
	return s.rainRepo.Delete(ctx, id)
}
func (s *service) ListRainStations(ctx context.Context, filter filter.Filter) ([]*models.RainStation, int64, error) {
	return s.rainRepo.List(ctx, filter)
}

// Lake Station Implementation
func (s *service) CreateLakeStation(ctx context.Context, input *models.LakeStation) (*models.LakeStation, error) {
	return s.lakeRepo.Create(ctx, input)
}
func (s *service) GetLakeStation(ctx context.Context, id string) (*models.LakeStation, error) {
	return s.lakeRepo.GetByID(ctx, id)
}
func (s *service) UpdateLakeStation(ctx context.Context, id string, input *models.LakeStation) error {
	return s.lakeRepo.Update(ctx, id, input)
}
func (s *service) DeleteLakeStation(ctx context.Context, id string) error {
	return s.lakeRepo.Delete(ctx, id)
}
func (s *service) ListLakeStations(ctx context.Context, filter filter.Filter) ([]*models.LakeStation, int64, error) {
	return s.lakeRepo.List(ctx, filter)
}

// River Station Implementation
func (s *service) CreateRiverStation(ctx context.Context, input *models.RiverStation) (*models.RiverStation, error) {
	return s.riverRepo.Create(ctx, input)
}
func (s *service) GetRiverStation(ctx context.Context, id string) (*models.RiverStation, error) {
	return s.riverRepo.GetByID(ctx, id)
}
func (s *service) UpdateRiverStation(ctx context.Context, id string, input *models.RiverStation) error {
	return s.riverRepo.Update(ctx, id, input)
}
func (s *service) DeleteRiverStation(ctx context.Context, id string) error {
	return s.riverRepo.Delete(ctx, id)
}
func (s *service) ListRiverStations(ctx context.Context, filter filter.Filter) ([]*models.RiverStation, int64, error) {
	return s.riverRepo.List(ctx, filter)
}
