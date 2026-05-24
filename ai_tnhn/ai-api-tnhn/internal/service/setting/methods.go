package setting

import (
	"ai-api-tnhn/internal/models"
	"context"
	"time"
)

func (s *service) GetSetting(ctx context.Context) (*models.AppSetting, error) {
	return s.repo.Get(ctx)
}

func (s *service) GetByCode(ctx context.Context, code string) (*models.AppSetting, error) {
	s.mu.RLock()
	item, exists := s.cache[code]
	if exists && time.Now().Before(item.expiredAt) {
		s.mu.RUnlock()
		return item.setting, nil
	}
	s.mu.RUnlock()

	// Cache miss or expired - query database
	setting, err := s.repo.GetByCode(ctx, code)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	s.cache[code] = &cacheItem{
		setting:   setting,
		expiredAt: time.Now().Add(s.cacheTTL),
	}
	s.mu.Unlock()

	return setting, nil
}

func (s *service) GetFloodLevels(ctx context.Context) ([]models.FloodLevel, error) {
	setting, err := s.GetByCode(ctx, "FloodLevel")
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
	err = s.repo.Save(ctx, setting)
	if err != nil {
		return err
	}

	// Update cache directly with new settings and refresh TTL
	s.mu.Lock()
	s.cache["FloodLevel"] = &cacheItem{
		setting:   setting,
		expiredAt: time.Now().Add(s.cacheTTL),
	}
	s.mu.Unlock()

	return nil
}

func (s *service) GetRainSetting(ctx context.Context) (*models.RainSetting, error) {
	setting, err := s.GetByCode(ctx, "RainSetting")
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
	err = s.repo.Save(ctx, setting)
	if err != nil {
		return err
	}

	// Update cache directly with new settings and refresh TTL
	s.mu.Lock()
	s.cache["RainSetting"] = &cacheItem{
		setting:   setting,
		expiredAt: time.Now().Add(s.cacheTTL),
	}
	s.mu.Unlock()

	return nil
}
