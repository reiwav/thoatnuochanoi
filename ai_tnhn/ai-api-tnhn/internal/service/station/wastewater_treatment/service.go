package wastewater_treatment

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

type Service interface {
	Create(ctx context.Context, input *models.WastewaterStation) (*models.WastewaterStation, error)
	Update(ctx context.Context, id string, input *models.WastewaterStation) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.WastewaterStation, error)
	List(ctx context.Context, f filter.Filter) ([]*models.WastewaterStation, int64, error)
	ListFiltered(ctx context.Context, orgID string, ids []string) ([]*models.WastewaterStation, error)

	// Reports
	SubmitReport(ctx context.Context, stationID string, userID string, userName string, note string) error
	GetHistory(ctx context.Context, stationID string, f filter.Filter) ([]*models.WastewaterStationReport, int64, error)
}

type service struct {
	repo repository.WastewaterStation
}

func NewService(repo repository.WastewaterStation) Service {
	return &service{
		repo: repo,
	}
}
