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

func (s *service) RegisterOnFloodLevelsUpdate(cb func(levels []models.FloodLevel)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onFloodLevelsUpdate = append(s.onFloodLevelsUpdate, cb)
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
	err = s.repo.Save(ctx, setting)
	if err != nil {
		return err
	}

	// Trigger callbacks to notify interested services (like inundation) to update/invalidate their caches
	s.mu.Lock()
	handlers := make([]func(levels []models.FloodLevel), len(s.onFloodLevelsUpdate))
	copy(handlers, s.onFloodLevelsUpdate)
	s.mu.Unlock()
	for _, cb := range handlers {
		cb(levels)
	}

	return nil
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
