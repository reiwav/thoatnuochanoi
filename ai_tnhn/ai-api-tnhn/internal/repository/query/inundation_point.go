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

type inundationStationRepo struct {
	*db.Table
}

func NewInundationStationRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.InundationStation {
	return &inundationStationRepo{
		Table: db.NewTable(collectionName, prefix, dbase, l),
	}
}

func (r *inundationStationRepo) List(ctx context.Context, f filter.Filter) ([]models.InundationStation, int64, error) {
	var points []models.InundationStation
	total, err := r.R_SearchAndCount(ctx, f, &points)
	return points, total, err
}

func (r *inundationStationRepo) ListByOrg(ctx context.Context, orgID string) ([]models.InundationStation, error) {
	var points []models.InundationStation
	filter := bson.M{"active": true}
	if orgID != "" {
		filter["org_id"] = orgID
	}
	err := r.R_SelectManyWithSort(ctx, filter, bson.M{"name": 1}, &points)
	return points, err
}

func (r *inundationStationRepo) GetByID(ctx context.Context, id string) (*models.InundationStation, error) {
	var point models.InundationStation
	err := r.R_SelectByID(ctx, id, &point)
	return &point, err
}

func (r *inundationStationRepo) Create(ctx context.Context, point models.InundationStation) (string, error) {
	err := r.R_Create(ctx, &point)
	return point.ID, err
}

func (r *inundationStationRepo) Update(ctx context.Context, point models.InundationStation) error {
	return r.R_Update(ctx, &point)
}

func (r *inundationStationRepo) Delete(ctx context.Context, id string) error {
	return r.R_DeleteByID(ctx, id)
}
