package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type EmergencyConstruction interface {
	mgo.BaseTable
	Upsert(ctx context.Context, item *models.EmergencyConstruction) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.EmergencyConstruction, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstruction, int64, error)
}

type EmergencyConstructionHistory interface {
	mgo.BaseTable
	Create(ctx context.Context, item *models.EmergencyConstructionHistory) error
	List(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstructionHistory, int64, error)
	ListByConstructionID(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionHistory, error)
}

type EmergencyConstructionSituation interface {
	mgo.BaseTable
	Create(ctx context.Context, item *models.EmergencyConstructionSituation) error
	List(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstructionSituation, int64, error)
	ListByConstructionID(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionSituation, error)
}
