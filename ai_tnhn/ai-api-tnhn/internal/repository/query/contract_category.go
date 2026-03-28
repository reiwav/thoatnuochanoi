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

type contractCategoryRepo struct {
	*db.Table
}

func NewContractCategoryRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.ContractCategory {
	return &contractCategoryRepo{
		Table: db.NewTable(collectionName, prefix, dbase, l),
	}
}

func (r *contractCategoryRepo) Upsert(ctx context.Context, category *models.ContractCategory) error {
	if category.ID == "" {
		return r.R_Create(ctx, category)
	}
	return r.R_Update(ctx, category)
}

func (r *contractCategoryRepo) Delete(ctx context.Context, id string) error {
	return r.R_DeleteByID(ctx, id)
}

func (r *contractCategoryRepo) GetByID(ctx context.Context, id string) (*models.ContractCategory, error) {
	var category models.ContractCategory
	err := r.R_SelectByID(ctx, id, &category)
	return &category, err
}

func (r *contractCategoryRepo) List(ctx context.Context, f filter.Filter) ([]*models.ContractCategory, int64, error) {
	var categories []*models.ContractCategory
	total, err := r.R_SearchAndCount(ctx, f, &categories)
	return categories, total, err
}

func (r *contractCategoryRepo) GetByPath(ctx context.Context, pathPrefix string) ([]*models.ContractCategory, error) {
	var categories []*models.ContractCategory
	// Find all categories where path starts with pathPrefix
	// The path algorithm (Materialized Path) stores something like ",id1,id2,"
	// Searching for all children of id1: search path prefix ",id1,"
	err := r.R_SelectMany(ctx, bson.M{"path": bson.M{"$regex": "^" + pathPrefix}}, &categories)
	return categories, err
}
