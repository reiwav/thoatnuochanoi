package repository

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type Contract interface {
	Upsert(ctx context.Context, contract *models.Contract) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.Contract, error)
	List(ctx context.Context, f filter.Filter) ([]*models.Contract, int64, error)
}
