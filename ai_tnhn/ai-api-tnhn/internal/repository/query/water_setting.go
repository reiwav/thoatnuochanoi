package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
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
	var records []*models.WaterThresholdSetting
	filter := bson.M{
		"status": "active",
	}
	err := r.R_SelectAndSort(ctx, filter, bson.D{{Key: "year", Value: -1}, {Key: "ctime", Value: -1}}, 0, 1, &records)
	if err != nil || len(records) == 0 {
		return nil, err
	}
	return records[0], nil
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
	err := r.R_SelectAndSort(ctx, filter, bson.D{{Key: "year", Value: -1}, {Key: "version", Value: -1}}, 0, 0, &res)
	return res, err
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
	var records []*models.WaterThresholdSetting
	filter := bson.M{"year": year}
	err := r.R_SelectAndSort(ctx, filter, bson.D{{Key: "version", Value: -1}}, 0, 1, &records)
	if err != nil {
		return 0, err
	}
	if len(records) == 0 {
		return 0, nil
	}
	return records[0].Version, nil
}

func (r waterThresholdSettingRepository) ArchiveAllActive(ctx context.Context, year int) error {
	filter := bson.M{
		"year":   year,
		"status": "active",
	}
	return r.R_UpdateAll(ctx, filter, bson.M{"status": "archived"})
}
