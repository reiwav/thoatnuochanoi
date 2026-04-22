package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/models"
	"context"
)

type AppSetting interface {
	mgo.BaseTable
	Get(ctx context.Context) (*models.AppSetting, error)
	GetByCode(ctx context.Context, code string) (*models.AppSetting, error)
	Save(ctx context.Context, setting *models.AppSetting) error
}
