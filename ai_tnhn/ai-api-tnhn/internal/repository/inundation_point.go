package repository

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type InundationStation interface {
	ListByOrg(ctx context.Context, orgID string) ([]models.InundationStation, error)
	List(ctx context.Context, filter filter.Filter) ([]models.InundationStation, int64, error)
	GetByID(ctx context.Context, id string) (*models.InundationStation, error)
	Create(ctx context.Context, point models.InundationStation) (string, error)
	Update(ctx context.Context, point models.InundationStation) error
	Delete(ctx context.Context, id string) error
}
