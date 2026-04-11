package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type RainStation interface {
	mgo.BaseTable
	GetByID(ctx context.Context, id string) (*models.RainStation, error)
	Create(ctx context.Context, input *models.RainStation) (*models.RainStation, error)
	Update(ctx context.Context, id string, input *models.RainStation) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filter filter.Filter) ([]*models.RainStation, int64, error)
	ListFiltered(ctx context.Context, orgID string, ids []string) ([]*models.RainStation, error)
}

type LakeStation interface {
	mgo.BaseTable
	GetByID(ctx context.Context, id string) (*models.LakeStation, error)
	Create(ctx context.Context, input *models.LakeStation) (*models.LakeStation, error)
	Update(ctx context.Context, id string, input *models.LakeStation) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filter filter.Filter) ([]*models.LakeStation, int64, error)
	ListFiltered(ctx context.Context, orgID string, ids []string) ([]*models.LakeStation, error)
}

type RiverStation interface {
	mgo.BaseTable
	GetByID(ctx context.Context, id string) (*models.RiverStation, error)
	Create(ctx context.Context, input *models.RiverStation) (*models.RiverStation, error)
	Update(ctx context.Context, id string, input *models.RiverStation) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filter filter.Filter) ([]*models.RiverStation, int64, error)
	ListFiltered(ctx context.Context, orgID string, ids []string) ([]*models.RiverStation, error)
}
