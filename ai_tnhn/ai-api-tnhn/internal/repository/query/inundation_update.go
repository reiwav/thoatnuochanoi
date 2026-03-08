package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/mongo"
)

type inundationUpdateRepo struct {
	*db.Table
}

func NewInundationUpdateRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.InundationUpdate {
	return &inundationUpdateRepo{
		Table: db.NewTable(collectionName, prefix, dbase, l),
	}
}

func (r *inundationUpdateRepo) Create(ctx context.Context, update *models.InundationUpdate) error {
	return r.R_Create(ctx, update)
}

func (r *inundationUpdateRepo) ListByReportID(ctx context.Context, reportID string) ([]*models.InundationUpdate, error) {
	var updates []*models.InundationUpdate
	f := filter.NewPaginationFilter()
	f.AddWhere("report_id", "report_id", reportID)
	f.SetOrderBy("timestamp") // Sort chronologically

	_, err := r.R_SearchAndCount(ctx, f, &updates)
	return updates, err
}
