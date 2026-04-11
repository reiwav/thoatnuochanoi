package repository

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type InundationPoint interface {
	ListByOrg(ctx context.Context, orgID string) ([]models.InundationPoint, error)
	List(ctx context.Context, filter filter.Filter) ([]models.InundationPoint, int64, error)
	GetByID(ctx context.Context, id string) (*models.InundationPoint, error)
	Create(ctx context.Context, point models.InundationPoint) (string, error)
	Update(ctx context.Context, point models.InundationPoint) error
	Delete(ctx context.Context, id string) error
}
