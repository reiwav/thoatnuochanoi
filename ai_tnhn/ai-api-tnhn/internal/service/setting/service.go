package setting

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

type Service interface {
	GetFloodLevels(ctx context.Context) ([]models.FloodLevel, error)
	UpdateFloodLevels(ctx context.Context, levels []models.FloodLevel) error
	GetSetting(ctx context.Context) (*models.AppSetting, error)
	GetRainSetting(ctx context.Context) (*models.RainSetting, error)
	UpdateRainSetting(ctx context.Context, rainSetting *models.RainSetting) error
}

type service struct {
	repo repository.AppSetting
}

func NewService(repo repository.AppSetting) Service {
	s := &service{
		repo: repo,
	}
	return s
}
