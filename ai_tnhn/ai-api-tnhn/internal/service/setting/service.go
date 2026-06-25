package setting

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"sync"
	"time"
)

type Service interface {
	GetFloodLevels(ctx context.Context) ([]models.FloodLevel, error)
	UpdateFloodLevels(ctx context.Context, levels []models.FloodLevel) error
	GetSetting(ctx context.Context) (*models.AppSetting, error)
	GetRainSetting(ctx context.Context) (*models.RainSetting, error)
	UpdateRainSetting(ctx context.Context, rainSetting *models.RainSetting) error
	GetByCode(ctx context.Context, code string) (*models.AppSetting, error)
	GetWaterSourceSetting(ctx context.Context) (*models.WaterSourceSetting, error)
	UpdateWaterSourceSetting(ctx context.Context, waterSourceSetting *models.WaterSourceSetting) error
}

type cacheItem struct {
	setting   *models.AppSetting
	expiredAt time.Time
}

type service struct {
	repo     repository.AppSetting
	cache    map[string]*cacheItem
	cacheTTL time.Duration
	mu       sync.RWMutex
}

func NewService(repo repository.AppSetting) Service {
	s := &service{
		repo:     repo,
		cache:    make(map[string]*cacheItem),
		cacheTTL: 5 * time.Minute,
	}
	return s
}
