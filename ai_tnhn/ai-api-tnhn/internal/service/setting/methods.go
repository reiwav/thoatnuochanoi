package setting

import (
	"ai-api-tnhn/internal/models"
	"context"
	"time"
)

func (s *service) GetSetting(ctx context.Context) (*models.AppSetting, error) {
	return s.repo.Get(ctx)
}

func (s *service) GetFloodLevels(ctx context.Context) ([]models.FloodLevel, error) {
	setting, err := s.repo.GetByCode(ctx, "FloodLevel")
	if err != nil {
		return nil, err
	}
	return setting.FloodLevels, nil
}

func (s *service) UpdateFloodLevels(ctx context.Context, levels []models.FloodLevel) error {
	setting, err := s.repo.GetByCode(ctx, "FloodLevel")
	if err != nil {
		return err
	}

	setting.Code = "FloodLevel"
	// Update timestamps for new levels if not set
	now := time.Now()
	for i := range levels {
		if levels[i].Ctime.IsZero() {
			levels[i].Ctime = now
		}
	}

	setting.FloodLevels = levels
	return s.repo.Save(ctx, setting)
}

func (s *service) GetRainSetting(ctx context.Context) (*models.RainSetting, error) {
	setting, err := s.repo.GetByCode(ctx, "RainSetting")
	if err != nil {
		return nil, err
	}
	if setting.RainSetting == nil {
		return &models.RainSetting{}, nil
	}
	return setting.RainSetting, nil
}

func (s *service) UpdateRainSetting(ctx context.Context, rainSetting *models.RainSetting) error {
	setting, err := s.repo.GetByCode(ctx, "RainSetting")
	if err != nil {
		return err
	}
	setting.Code = "RainSetting"
	setting.RainSetting = rainSetting
	return s.repo.Save(ctx, setting)
}
