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

type inundationHistoryRepo struct {
	*db.Table
}

func NewInundationHistoryRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.InundationHistory {
	return &inundationHistoryRepo{
		Table: db.NewTable(collectionName, prefix, dbase, l),
	}
}

func (r *inundationHistoryRepo) Create(ctx context.Context, history *models.InundationHistory) error {
	return r.R_Create(ctx, history)
}

func (r *inundationHistoryRepo) GetByID(ctx context.Context, id string) (*models.InundationHistory, error) {
	var history models.InundationHistory
	err := r.R_SelectByID(ctx, id, &history)
	return &history, err
}

func (r *inundationHistoryRepo) GetByIDs(ctx context.Context, ids []string) ([]*models.InundationHistory, error) {
	var histories []*models.InundationHistory
	if len(ids) == 0 {
		return histories, nil
	}
	f := bson.M{"_id": bson.M{"$in": ids}}
	err := r.R_SelectMany(ctx, f, &histories)
	return histories, err
}

func (r *inundationHistoryRepo) Update(ctx context.Context, history *models.InundationHistory) error {
	return r.R_Update(ctx, history)
}

func (r *inundationHistoryRepo) ListByReportID(ctx context.Context, reportID string) ([]*models.InundationHistory, error) {
	var histories []*models.InundationHistory
	f := filter.NewPaginationFilter()
	f.AddWhere("inundation_or_report_id", "$or", []bson.M{
		{"inundation_id": reportID},
		{"report_id": reportID},
	})
	f.SetOrderBy("created_at") // Sort chronologically by creation time

	_, err := r.R_SearchAndCount(ctx, f, &histories)
	return histories, err
}

func (r *inundationHistoryRepo) List(ctx context.Context, f filter.Filter) ([]*models.InundationHistory, int64, error) {
	var histories []*models.InundationHistory
	total, err := r.R_SearchAndCount(ctx, f, &histories)
	return histories, total, err
}
