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

type inundationPointRepo struct {
	*db.Table
}

func NewInundationPointRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.InundationPoint {
	return &inundationPointRepo{
		Table: db.NewTable(collectionName, prefix, dbase, l),
	}
}

func (r *inundationPointRepo) List(ctx context.Context, f filter.Filter) ([]models.InundationPoint, int64, error) {
	var points []models.InundationPoint
	total, err := r.R_SearchAndCount(ctx, f, &points)
	return points, total, err
}

func (r *inundationPointRepo) ListByOrg(ctx context.Context, orgID string) ([]models.InundationPoint, error) {
	var points []models.InundationPoint
	filter := bson.M{"active": true}
	if orgID != "" {
		filter["org_id"] = orgID
	}
	err := r.R_SelectMany(ctx, filter, &points)
	return points, err
}

func (r *inundationPointRepo) GetByID(ctx context.Context, id string) (*models.InundationPoint, error) {
	var point models.InundationPoint
	err := r.R_SelectByID(ctx, id, &point)
	return &point, err
}

func (r *inundationPointRepo) Create(ctx context.Context, point models.InundationPoint) (string, error) {
	err := r.R_Create(ctx, &point)
	return point.ID, err
}

func (r *inundationPointRepo) Update(ctx context.Context, point models.InundationPoint) error {
	return r.R_Update(ctx, &point)
}

func (r *inundationPointRepo) Delete(ctx context.Context, id string) error {
	return r.R_DeleteByID(ctx, id)
}
