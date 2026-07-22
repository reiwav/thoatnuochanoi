package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type waterThresholdSettingRepository struct {
	*db.Table
}

func NewWaterThresholdSettingRepository(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.WaterThresholdSetting {
	repo := waterThresholdSettingRepository{db.NewTable(name, prefix, dbc, l)}
	return repo
}

func (r waterThresholdSettingRepository) GetActive(ctx context.Context, year int) (*models.WaterThresholdSetting, error) {
	var m *models.WaterThresholdSetting
	filter := bson.M{
		"year":   year,
		"status": "active",
	}
	err := r.R_SelectOne(ctx, filter, &m)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return m, err
}

func (r waterThresholdSettingRepository) GetLatestActive(ctx context.Context) (*models.WaterThresholdSetting, error) {
	var m *models.WaterThresholdSetting
	filter := bson.M{
		"status": "active",
	}
	opts := options.FindOne().SetSort(bson.D{{Key: "year", Value: -1}, {Key: "ctime", Value: -1}})
	err := r.Collection.FindOne(ctx, filter, opts).Decode(&m)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return m, err
}

func (r waterThresholdSettingRepository) List(ctx context.Context, year int, status string) ([]*models.WaterThresholdSetting, error) {
	var res []*models.WaterThresholdSetting
	filter := bson.M{}
	if year > 0 {
		filter["year"] = year
	}
	if status != "" {
		filter["status"] = status
	}
	opts := options.Find().SetSort(bson.D{{Key: "year", Value: -1}, {Key: "version", Value: -1}})
	cursor, err := r.Collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &res); err != nil {
		return nil, err
	}
	return res, nil
}

func (r waterThresholdSettingRepository) GetByID(ctx context.Context, id string) (*models.WaterThresholdSetting, error) {
	var m *models.WaterThresholdSetting
	filter := bson.M{"_id": id}
	err := r.R_SelectOne(ctx, filter, &m)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return m, err
}

func (r waterThresholdSettingRepository) Create(ctx context.Context, setting *models.WaterThresholdSetting) error {
	return r.R_Create(ctx, setting)
}

func (r waterThresholdSettingRepository) Update(ctx context.Context, setting *models.WaterThresholdSetting) error {
	setting.BeforeUpdate()
	return r.R_Update(ctx, setting)
}

func (r waterThresholdSettingRepository) GetMaxVersion(ctx context.Context, year int) (int, error) {
	filter := bson.M{"year": year}
	opts := options.FindOne().SetSort(bson.D{{Key: "version", Value: -1}})
	var m models.WaterThresholdSetting
	err := r.Collection.FindOne(ctx, filter, opts).Decode(&m)
	if err == mongo.ErrNoDocuments {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return m.Version, nil
}

func (r waterThresholdSettingRepository) ArchiveAllActive(ctx context.Context, year int) error {
	filter := bson.M{
		"year":   year,
		"status": "active",
	}
	update := bson.M{
		"$set": bson.M{
			"status": "archived",
		},
	}
	_, err := r.Collection.UpdateMany(ctx, filter, update)
	return err
}
