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

type appSettingRepository struct {
	*db.Table
}

func NewAppSettingRepository(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.AppSetting {
	return appSettingRepository{db.NewTable(name, prefix, dbc, l)}
}

func (r appSettingRepository) Get(ctx context.Context) (*models.AppSetting, error) {
	var m *models.AppSetting
	// Always get the first document as fallback
	err := r.R_SelectOne(ctx, bson.M{}, &m)
	if err == mongo.ErrNoDocuments {
		return &models.AppSetting{
			FloodLevels: []models.FloodLevel{},
		}, nil
	}
	return m, err
}

func (r appSettingRepository) GetByCode(ctx context.Context, code string) (*models.AppSetting, error) {
	var m *models.AppSetting
	err := r.R_SelectOne(ctx, bson.M{"code": code}, &m)
	if err == mongo.ErrNoDocuments {
		return &models.AppSetting{
			Code:        code,
			FloodLevels: []models.FloodLevel{},
		}, nil
	}
	return m, err
}

func (r appSettingRepository) Save(ctx context.Context, setting *models.AppSetting) error {
	if setting.Code == "" {
		return r.R_Create(ctx, setting)
	}

	filter := bson.M{"code": setting.Code}
	setting.BeforeUpdate()

	_, err := r.Collection.ReplaceOne(ctx, filter, setting, options.Replace().SetUpsert(true))
	return err
}
