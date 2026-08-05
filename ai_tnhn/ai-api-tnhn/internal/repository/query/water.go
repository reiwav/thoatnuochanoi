package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type rainRepository struct {
	*db.Table
}

func NewRainRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.Rain {
	return rainRepository{db.NewTable(name, prefix, dbc, l)}
}

func (p rainRepository) GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RainRecord, error) {
	var records []*models.RainRecord
	filter := bson.M{"station_id": stationID}
	if date != "" {
		filter["date"] = date
	}
	err := p.R_SelectAndSort(ctx, filter, bson.M{"timestamp": -1}, 0, limit, &records)
	return records, err
}

func (p rainRepository) GetAllByStationID(ctx context.Context, stationID int64, startTime time.Time, endTime time.Time) ([]models.RainRecord, error) {
	var records []models.RainRecord
	err := p.R_SelectManyWithSort(ctx,
		bson.M{
			"station_id": stationID,
			"timestamp": bson.M{
				"$gte": startTime,
				"$lte": endTime,
			},
		},
		bson.M{"timestamp": -1}, &records)
	return records, err
}

func (p rainRepository) GetByDate(ctx context.Context, date string) ([]*models.RainRecord, error) {
	var records []*models.RainRecord
	err := p.R_SelectMany(ctx, bson.M{"date": date}, &records)
	return records, err
}

func (p rainRepository) GetByDateRange(ctx context.Context, startTime, endTime time.Time) ([]*models.RainRecord, error) {
	var records []*models.RainRecord
	err := p.R_SelectManyWithSort(ctx, bson.M{
		"timestamp": bson.M{
			"$gte": startTime,
			"$lte": endTime,
		},
	}, bson.M{"timestamp": -1}, &records)
	return records, err
}

func (p rainRepository) GetLatest(ctx context.Context, stationID int64) (*models.RainRecord, error) {
	var records []*models.RainRecord
	err := p.R_SelectAndSort(ctx, bson.M{"station_id": stationID}, bson.M{"timestamp": -1}, 0, 1, &records)
	if err != nil || len(records) == 0 {
		return nil, err
	}
	return records[0], nil
}

func (p rainRepository) Exists(ctx context.Context, stationID int64, timestamp time.Time) (bool, error) {
	count, err := p.R_Count(ctx, bson.M{
		"station_id": stationID,
		"timestamp":  timestamp,
	})
	return count > 0, err
}

func (p rainRepository) GetAggregateStats(ctx context.Context, filter bson.M, groupBy string) ([]map[string]interface{}, error) {
	var groupID interface{}
	switch groupBy {
	case "year":
		groupID = bson.D{{Key: "$substr", Value: bson.A{"$date", 0, 4}}}
	case "month":
		groupID = bson.D{{Key: "$substr", Value: bson.A{"$date", 0, 7}}}
	default:
		groupID = "$" + groupBy
	}

	pipeline := []bson.M{
		{"$match": filter},
		{"$group": bson.M{
			"_id":         groupID,
			"total_value": bson.M{"$sum": "$value"},
			"avg_value":   bson.M{"$avg": "$value"},
			"count":       bson.M{"$sum": 1},
		}},
		{"$sort": bson.M{"_id": 1}},
	}

	var results []map[string]interface{}
	err := p.R_Pipe(ctx, pipeline, &results)
	return results, err
}
func (p rainRepository) Create(ctx context.Context, record *models.RainRecord) error {
	return p.R_Create(ctx, record)
}

// =============================================================================

type lakeRepository struct {
	*db.Table
}

func NewLakeRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.Lake {
	return lakeRepository{db.NewTable(name, prefix, dbc, l)}
}

func (p lakeRepository) GetAllByStationID(ctx context.Context, stationID int64, startTime time.Time, endTime time.Time) ([]*models.LakeRecord, error) {
	var records []*models.LakeRecord
	err := p.R_SelectManyWithSort(ctx,
		bson.M{
			"station_id": stationID,
			"timestamp": bson.M{
				"$gte": startTime,
				"$lte": endTime,
			},
		},
		bson.M{"timestamp": -1}, &records)
	return records, err
}

func (p lakeRepository) GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error) {
	var records []*models.LakeRecord
	filter := bson.M{"station_id": stationID}
	if date != "" {
		filter["date"] = date
	}
	err := p.R_SelectAndSort(ctx, filter, bson.M{"timestamp": -1}, 0, limit, &records)
	return records, err
}

func (p lakeRepository) GetByDate(ctx context.Context, date string) ([]*models.LakeRecord, error) {
	var records []*models.LakeRecord
	err := p.R_SelectAndSort(ctx, bson.M{"date": date}, bson.D{{Key: "timestamp", Value: 1}, {Key: "_id", Value: 1}}, 0, 0, &records)
	return records, err
}

func (p lakeRepository) GetByDateRange(ctx context.Context, startTime, endTime time.Time) ([]*models.LakeRecord, error) {
	var records []*models.LakeRecord
	filter := bson.M{
		"timestamp": bson.M{
			"$gte": startTime,
			"$lte": endTime,
		},
	}
	err := p.R_SelectAndSort(ctx, filter, bson.D{{Key: "timestamp", Value: 1}, {Key: "_id", Value: 1}}, 0, 0, &records)
	return records, err
}

func (p lakeRepository) GetLatest(ctx context.Context, stationID int64) (*models.LakeRecord, error) {
	var records []*models.LakeRecord
	err := p.R_SelectAndSort(ctx, bson.M{"station_id": stationID}, bson.M{"timestamp": -1}, 0, 1, &records)
	if err != nil || len(records) == 0 {
		return nil, err
	}
	return records[0], nil
}
func (p lakeRepository) Create(ctx context.Context, record *models.LakeRecord) error {
	return p.R_Create(ctx, record)
}

func (p lakeRepository) UpdateValueByID(ctx context.Context, id string, value float64, source string) error {
	update := bson.M{
		"$set": bson.M{
			"value":      value,
			"source":     source,
			"updated_at": time.Now().Unix(),
		},
	}
	return p.R_UnsafeUpdateByID(ctx, id, update)
}

func (p lakeRepository) Exists(ctx context.Context, stationID int64, timestamp time.Time) (bool, error) {
	count, err := p.R_Count(ctx, bson.M{
		"station_id": stationID,
		"timestamp":  timestamp,
	})
	return count > 0, err
}

// =============================================================================

type riverRepository struct {
	*db.Table
}

func NewRiverRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.River {
	return riverRepository{db.NewTable(name, prefix, dbc, l)}
}

func (p riverRepository) GetAllByStationID(ctx context.Context, stationID int64, startTime time.Time, endTime time.Time) ([]*models.RiverRecord, error) {
	var records []*models.RiverRecord
	err := p.R_SelectManyWithSort(ctx,
		bson.M{
			"station_id": stationID,
			"timestamp": bson.M{
				"$gte": startTime,
				"$lte": endTime,
			},
		},
		bson.M{"timestamp": -1}, &records)
	return records, err
}

func (p riverRepository) GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error) {
	var records []*models.RiverRecord
	filter := bson.M{"station_id": stationID}
	if date != "" {
		filter["date"] = date
	}
	err := p.R_SelectAndSort(ctx, filter, bson.M{"timestamp": -1}, 0, limit, &records)
	return records, err
}

func (p riverRepository) GetByDate(ctx context.Context, date string) ([]*models.RiverRecord, error) {
	var records []*models.RiverRecord
	err := p.R_SelectAndSort(ctx, bson.M{"date": date}, bson.D{{Key: "timestamp", Value: 1}, {Key: "_id", Value: 1}}, 0, 0, &records)
	return records, err
}

func (p riverRepository) GetByDateRange(ctx context.Context, startTime, endTime time.Time) ([]*models.RiverRecord, error) {
	var records []*models.RiverRecord
	filter := bson.M{
		"timestamp": bson.M{
			"$gte": startTime,
			"$lte": endTime,
		},
	}
	err := p.R_SelectAndSort(ctx, filter, bson.D{{Key: "timestamp", Value: 1}, {Key: "_id", Value: 1}}, 0, 0, &records)
	return records, err
}

func (p riverRepository) GetLatest(ctx context.Context, stationID int64) (*models.RiverRecord, error) {
	var records []*models.RiverRecord
	err := p.R_SelectAndSort(ctx, bson.M{"station_id": stationID}, bson.M{"timestamp": -1}, 0, 1, &records)
	if err != nil || len(records) == 0 {
		return nil, err
	}
	return records[0], nil
}
func (p riverRepository) Create(ctx context.Context, record *models.RiverRecord) error {
	return p.R_Create(ctx, record)
}

func (p riverRepository) UpdateValueByID(ctx context.Context, id string, value float64, source string) error {
	update := bson.M{
		"$set": bson.M{
			"value":      value,
			"source":     source,
			"updated_at": time.Now().Unix(),
		},
	}
	return p.R_UnsafeUpdateByID(ctx, id, update)
}

func (p riverRepository) Exists(ctx context.Context, stationID int64, timestamp time.Time) (bool, error) {
	count, err := p.R_Count(ctx, bson.M{
		"station_id": stationID,
		"timestamp":  timestamp,
	})
	return count > 0, err
}
