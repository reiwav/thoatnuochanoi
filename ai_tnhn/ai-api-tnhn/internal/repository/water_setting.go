package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/models"
	"context"
)

type WaterThresholdSetting interface {
	mgo.BaseTable
	GetActive(ctx context.Context, year int) (*models.WaterThresholdSetting, error)
	GetLatestActive(ctx context.Context) (*models.WaterThresholdSetting, error)
	List(ctx context.Context, year int, status string) ([]*models.WaterThresholdSetting, error)
	GetByID(ctx context.Context, id string) (*models.WaterThresholdSetting, error)
	Create(ctx context.Context, setting *models.WaterThresholdSetting) error
	Update(ctx context.Context, setting *models.WaterThresholdSetting) error
	GetMaxVersion(ctx context.Context, year int) (int, error)
	ArchiveAllActive(ctx context.Context, year int) error
}
