package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type User interface {
	mgo.BaseTable
	GetByID(ctx context.Context, id string) (*models.User, error)
	Create(ctx context.Context, input *models.User) (*models.User, error)
	Update(ctx context.Context, id string, input *models.User) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filter filter.Filter) ([]*models.User, int64, error)
}
