package pumpingstation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

type Service interface {
	Create(ctx context.Context, input *models.PumpingStation) (*models.PumpingStation, error)
	Update(ctx context.Context, id string, input *models.PumpingStation) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.PumpingStation, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.PumpingStation, int64, error)
	GetOrgByID(ctx context.Context, id string) (*models.Organization, error)

	// History
	CreateHistory(ctx context.Context, user *models.User, history *models.PumpingStationHistory) (*models.PumpingStationHistory, error)
	ListHistory(ctx context.Context, filter filter.Filter) ([]*models.PumpingStationHistory, int64, error)

	SetWorker(w interface{})

	// Summary for external consumers
	GetPumpingStationSummary(ctx context.Context, orgID string, assignedIDs []string) (*PumpingStationSummaryData, error)
}

type Worker interface {
	Restart(ctx context.Context)
}

type service struct {
	stationRepo repository.PumpingStation
	userRepo    repository.User
	orgRepo     repository.Organization
	worker      Worker
}

func NewService(stationRepo repository.PumpingStation, userRepo repository.User, orgRepo repository.Organization) Service {
	return &service{
		stationRepo: stationRepo,
		userRepo:    userRepo,
		orgRepo:     orgRepo,
	}
}
