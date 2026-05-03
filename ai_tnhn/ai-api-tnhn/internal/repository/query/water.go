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
	"go.mongodb.org/mongo-driver/mongo/options"
)

type rainRepository struct {
	*db.Table
}

func NewRainRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.Rain {
	return rainRepository{db.NewTable(name, prefix, dbc, l)}
}

func (p rainRepository) GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RainRecord, error) {
	var records []*models.RainRecord
	opts := options.Find().SetLimit(limit).SetSort(bson.M{"timestamp": -1})
	filter := bson.M{"station_id": stationID}
	if date != "" {
		filter["date"] = date
	}
	cursor, err := p.Collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	err = cursor.All(ctx, &records)
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
	cursor, err := p.Collection.Find(ctx, bson.M{"date": date})
	if err != nil {
		return nil, err
	}
	err = cursor.All(ctx, &records)
	return records, err
}

func (p rainRepository) GetLatest(ctx context.Context, stationID int64) (*models.RainRecord, error) {
	var m *models.RainRecord
	opts := options.FindOne().SetSort(bson.M{"timestamp": -1})
	err := p.Collection.FindOne(ctx, bson.M{"station_id": stationID}, opts).Decode(&m)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return m, err
}

func (p rainRepository) Exists(ctx context.Context, stationID int64, timestamp time.Time) (bool, error) {
	count, err := p.Collection.CountDocuments(ctx, bson.M{
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

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: groupID},
			{Key: "total", Value: bson.D{{Key: "$sum", Value: "$value"}}},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "avg", Value: bson.D{{Key: "$avg", Value: "$value"}}},
			{Key: "max", Value: bson.D{{Key: "$max", Value: "$value"}}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
	}

	cursor, err := p.Collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []map[string]interface{}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
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

func (p lakeRepository) GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error) {
	var records []*models.LakeRecord
	opts := options.Find().SetLimit(limit).SetSort(bson.M{"timestamp": -1})
	filter := bson.M{"station_id": stationID}
	if date != "" {
		filter["date"] = date
	}
	cursor, err := p.Collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	err = cursor.All(ctx, &records)
	return records, err
}

func (p lakeRepository) GetByDate(ctx context.Context, date string) ([]*models.LakeRecord, error) {
	var records []*models.LakeRecord
	cursor, err := p.Collection.Find(ctx, bson.M{"date": date})
	if err != nil {
		return nil, err
	}
	err = cursor.All(ctx, &records)
	return records, err
}

func (p lakeRepository) GetLatest(ctx context.Context, stationID int64) (*models.LakeRecord, error) {
	var m *models.LakeRecord
	opts := options.FindOne().SetSort(bson.M{"timestamp": -1})
	err := p.Collection.FindOne(ctx, bson.M{"station_id": stationID}, opts).Decode(&m)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return m, err
}
func (p lakeRepository) Create(ctx context.Context, record *models.LakeRecord) error {
	return p.R_Create(ctx, record)
}

func (p lakeRepository) Exists(ctx context.Context, stationID int64, timestamp time.Time) (bool, error) {
	count, err := p.Collection.CountDocuments(ctx, bson.M{
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

func (p riverRepository) GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error) {
	var records []*models.RiverRecord
	opts := options.Find().SetLimit(limit).SetSort(bson.M{"timestamp": -1})
	filter := bson.M{"station_id": stationID}
	if date != "" {
		filter["date"] = date
	}
	cursor, err := p.Collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	err = cursor.All(ctx, &records)
	return records, err
}

func (p riverRepository) GetByDate(ctx context.Context, date string) ([]*models.RiverRecord, error) {
	var records []*models.RiverRecord
	cursor, err := p.Collection.Find(ctx, bson.M{"date": date})
	if err != nil {
		return nil, err
	}
	err = cursor.All(ctx, &records)
	return records, err
}

func (p riverRepository) GetLatest(ctx context.Context, stationID int64) (*models.RiverRecord, error) {
	var m *models.RiverRecord
	opts := options.FindOne().SetSort(bson.M{"timestamp": -1})
	err := p.Collection.FindOne(ctx, bson.M{"station_id": stationID}, opts).Decode(&m)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return m, err
}
func (p riverRepository) Create(ctx context.Context, record *models.RiverRecord) error {
	return p.R_Create(ctx, record)
}

func (p riverRepository) Exists(ctx context.Context, stationID int64, timestamp time.Time) (bool, error) {
	count, err := p.Collection.CountDocuments(ctx, bson.M{
		"station_id": stationID,
		"timestamp":  timestamp,
	})
	return count > 0, err
}
