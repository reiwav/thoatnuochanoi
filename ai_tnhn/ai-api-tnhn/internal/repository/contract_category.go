package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type ContractCategory interface {
	mgo.BaseTable
	Upsert(ctx context.Context, category *models.ContractCategory) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.ContractCategory, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.ContractCategory, int64, error)
	GetByPath(ctx context.Context, pathPrefix string) ([]*models.ContractCategory, error)
}
