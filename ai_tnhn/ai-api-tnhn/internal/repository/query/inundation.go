package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type inundationRepo struct {
	*db.Table
}

func NewInundationRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.Inundation {
	return &inundationRepo{
		Table: db.NewTable(collectionName, prefix, dbase, l),
	}
}

func (r *inundationRepo) Create(ctx context.Context, report *models.InundationReport) error {
	return r.R_Create(ctx, report)
}

func (r *inundationRepo) GetByID(ctx context.Context, id string) (*models.InundationReport, error) {
	var report models.InundationReport
	err := r.R_SelectByID(ctx, id, &report)
	return &report, err
}

func (r *inundationRepo) List(ctx context.Context, filter filter.Filter) ([]*models.InundationReport, int64, error) {
	var reports []*models.InundationReport
	total, err := r.R_SearchAndCount(ctx, filter, &reports)
	return reports, total, err
}

func (r *inundationRepo) UpdateStatus(ctx context.Context, id string, status string) error {
	update := bson.M{"status": status, "updated_at": time.Now().Unix()}
	if status == "resolved" || status == "normal" {
		update["traffic_status"] = ""
	}
	return r.R_UnsafeUpdateByID(ctx, id, bson.M{"$set": update})
}

func (r *inundationRepo) Resolve(ctx context.Context, id string, endTime int64) error {
	return r.R_UnsafeUpdateByID(ctx, id, bson.M{"$set": bson.M{
		"status":         "resolved",
		"end_time":       endTime,
		"traffic_status": "",
		"updated_at":     time.Now().Unix(),
	}})
}

func (r *inundationRepo) Update(ctx context.Context, report *models.InundationReport) error {
	return r.R_Update(ctx, report)
}
