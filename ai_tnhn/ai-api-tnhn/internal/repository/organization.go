package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type Organization interface {
	mgo.BaseTable

	GetAll(ctx context.Context) ([]*models.Organization, error)
	Upsert(ctx context.Context, org *models.Organization) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.Organization, error)
	GetByCode(ctx context.Context, code string) (*models.Organization, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.Organization, int64, error)
	UpdateDriveFolderID(ctx context.Context, id, folderID string) error
}
