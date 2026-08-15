package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/utils"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type inundationRepo struct {
	*db.Table
}

func NewInundationRepository(dbase *mongo.Database, collectionName string, prefix string, l logger.Logger) repository.InundationReport {
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

func (r *inundationRepo) GetByIDs(ctx context.Context, ids []string) ([]*models.InundationReport, error) {
	var reports []*models.InundationReport
	if len(ids) == 0 {
		return reports, nil
	}
	f := bson.M{"_id": bson.M{"$in": ids}}
	err := r.R_SelectMany(ctx, f, &reports)
	return reports, err
}

func (r *inundationRepo) List(ctx context.Context, filter filter.Filter) ([]*models.InundationReport, int64, error) {
	var reports []*models.InundationReport
	total, err := r.R_SearchAndCount(ctx, filter, &reports)
	return reports, total, err
}

func (r *inundationRepo) Resolve(ctx context.Context, id string, endTime int64) error {
	return r.R_UnsafeUpdateByID(ctx, id, bson.M{"$set": bson.M{
		"status":         "resolved",
		"end_time":       endTime,
		"traffic_status": "",
		"is_flooding":    false,
		"updated_at":     time.Now().Unix(),
	}})
}

func (r *inundationRepo) Update(ctx context.Context, report *models.InundationReport) error {
	return r.R_Update(ctx, report)
}

func (r *inundationRepo) ListByYear(ctx context.Context, orgID string, year int, pointIDs []string) ([]*models.InundationReport, error) {
	startOfYear := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC).Unix()
	endOfYear := time.Date(year, 12, 31, 23, 59, 59, 0, time.UTC).Unix()

	filter := bson.M{
		"created_at": bson.M{
			"$gte": startOfYear,
			"$lte": endOfYear,
		},
		"deleted_at":  0,
		"has_flooded": true,
	}

	if orgID != "" {
		if len(pointIDs) > 0 {
			filter["$or"] = []bson.M{
				{"org_id": orgID},
				{"point_id": bson.M{"$in": pointIDs}},
			}
		} else {
			filter["org_id"] = orgID
		}
	}

	var reports []*models.InundationReport
	err := r.R_SelectAndSort(ctx, filter, bson.D{{Key: "created_at", Value: 1}}, 0, 0, &reports)
	return reports, err
}

func (r *inundationRepo) ListByDateRange(ctx context.Context, startDate, endDate string, pointID string) ([]*models.InundationReport, error) {
	tStart, err := time.ParseInLocation("2006-01-02", startDate, utils.VietnamLocation)
	if err != nil {
		return nil, err
	}
	tEnd, err := time.ParseInLocation("2006-01-02", endDate, utils.VietnamLocation)
	if err != nil {
		return nil, err
	}

	startUnix := time.Date(tStart.Year(), tStart.Month(), tStart.Day(), 0, 0, 0, 0, utils.VietnamLocation).Unix()
	endUnix := time.Date(tEnd.Year(), tEnd.Month(), tEnd.Day(), 23, 59, 59, 999999999, utils.VietnamLocation).Unix()

	filter := bson.M{
		"created_at": bson.M{
			"$gte": startUnix,
			"$lte": endUnix,
		},
		"deleted_at":  0,
		"has_flooded": true,
	}

	if pointID != "" {
		filter["point_id"] = pointID
	}

	var reports []*models.InundationReport
	err = r.R_SelectAndSort(ctx, filter, bson.D{{Key: "created_at", Value: 1}}, 0, 0, &reports)
	return reports, err
}
