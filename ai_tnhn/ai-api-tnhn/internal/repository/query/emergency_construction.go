package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type emConstructionRepo struct {
	*db.Table
}

func NewEmergencyConstructionRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.EmergencyConstruction {
	return &emConstructionRepo{
		Table: db.NewTable(collectionName, prefix, dbase, l),
	}
}

func (r *emConstructionRepo) Upsert(ctx context.Context, item *models.EmergencyConstruction) error {
	if item.ID == "" {
		return r.R_Create(ctx, item)
	}
	return r.R_Update(ctx, item)
}

func (r *emConstructionRepo) Delete(ctx context.Context, id string) error {
	return r.R_DeleteByID(ctx, id)
}

func (r *emConstructionRepo) GetByID(ctx context.Context, id string) (*models.EmergencyConstruction, error) {
	var item models.EmergencyConstruction
	err := r.R_SelectByID(ctx, id, &item)
	return &item, err
}

func (r *emConstructionRepo) List(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstruction, int64, error) {
	var items []*models.EmergencyConstruction
	total, err := r.R_SearchAndCount(ctx, filter, &items)
	return items, total, err
}

type emConstructionHistoryRepo struct {
	*db.Table
}

func NewEmergencyConstructionHistoryRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.EmergencyConstructionHistory {
	return &emConstructionHistoryRepo{
		Table: db.NewTable(collectionName, prefix, dbase, l),
	}
}

func (r *emConstructionHistoryRepo) Create(ctx context.Context, item *models.EmergencyConstructionHistory) error {
	return r.R_Create(ctx, item)
}

func (r *emConstructionHistoryRepo) List(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstructionHistory, int64, error) {
	var items []*models.EmergencyConstructionHistory
	total, err := r.R_SearchAndCount(ctx, filter, &items)
	return items, total, err
}

func (r *emConstructionHistoryRepo) ListByConstructionID(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionHistory, error) {
	var items []*models.EmergencyConstructionHistory
	f := bson.M{"construction_id": constructionID}
	err := r.R_SelectMany(ctx, f, &items)
	return items, err
}

type emConstructionProgressRepo struct {
	*db.Table
}

func NewEmergencyConstructionProgressRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.EmergencyConstructionProgress {
	return &emConstructionProgressRepo{
		Table: db.NewTable(collectionName, prefix, dbase, l),
	}
}

func (r *emConstructionProgressRepo) Create(ctx context.Context, item *models.EmergencyConstructionProgress) error {
	return r.R_Create(ctx, item)
}

func (r *emConstructionProgressRepo) List(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstructionProgress, int64, error) {
	var items []*models.EmergencyConstructionProgress
	total, err := r.R_SearchAndCount(ctx, filter, &items)
	return items, total, err
}

func (r *emConstructionProgressRepo) ListByConstructionID(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionProgress, error) {
	var items []*models.EmergencyConstructionProgress
	f := bson.M{"construction_id": constructionID}
	err := r.R_SelectMany(ctx, f, &items)
	return items, err
}
