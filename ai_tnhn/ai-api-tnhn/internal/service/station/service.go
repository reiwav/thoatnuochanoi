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
	ListRainStationsFiltered(ctx context.Context, orgID string, ids []string) ([]*models.RainStation, error)
	ListLakeStationsFiltered(ctx context.Context, orgID string, ids []string) ([]*models.LakeStation, error)
	ListRiverStationsFiltered(ctx context.Context, orgID string, ids []string) ([]*models.RiverStation, error)
	GetOrgByID(ctx context.Context, id string) (*models.Organization, error)
}

type service struct {
	rainRepo  repository.RainStation
	lakeRepo  repository.LakeStation
	riverRepo repository.RiverStation
	orgRepo   repository.Organization
}

func NewService(rain repository.RainStation, lake repository.LakeStation, river repository.RiverStation, org repository.Organization) Service {
	return &service{
		rainRepo:  rain,
		lakeRepo:  lake,
		riverRepo: river,
		orgRepo:   org,
	}
}
