package setting

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"sync"
	"time"
)

type WaterThresholdService interface {
	GetActiveSetting(ctx context.Context, year int) (*models.WaterThresholdSetting, error)
	GetLatestActiveSetting(ctx context.Context) (*models.WaterThresholdSetting, error)
	ListSettings(ctx context.Context, year int, status string) ([]*models.WaterThresholdSetting, error)
	CreateSetting(ctx context.Context, setting *models.WaterThresholdSetting, user *models.User) (*models.WaterThresholdSetting, error)
	ActivateSetting(ctx context.Context, id string, user *models.User) (*models.WaterThresholdSetting, error)
	CalculateThresholdStatus(ctx context.Context, timestamp time.Time, stationConfigs []models.StationThresholdConfig, value float64) (status string, min float64, max float64)
	ReloadCache(ctx context.Context) error
	StartCron(ctx context.Context)
}

type waterThresholdService struct {
	repo        repository.WaterThresholdSetting
	activeCache map[int]*models.WaterThresholdSetting // map[year]*models.WaterThresholdSetting
	mu          sync.RWMutex
	logger      logger.Logger
}

func NewWaterThresholdService(repo repository.WaterThresholdSetting, l logger.Logger) WaterThresholdService {
	s := &waterThresholdService{
		repo:        repo,
		activeCache: make(map[int]*models.WaterThresholdSetting),
		logger:      l,
	}

	// Initial load of cache
	_ = s.ReloadCache(context.Background())

	return s
}

func (s *waterThresholdService) ReloadCache(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	activeList, err := s.repo.List(ctx, 0, "active")
	if err != nil {
		if s.logger != nil {
			s.logger.GetLogger().Errorf("[WaterThresholdService] ReloadCache failed: %v", err)
		}
		return err
	}

	newCache := make(map[int]*models.WaterThresholdSetting)
	for _, item := range activeList {
		newCache[item.Year] = item
	}
	s.activeCache = newCache

	if s.logger != nil {
		s.logger.GetLogger().Infof("[WaterThresholdService] ReloadCache success, cached %d active settings", len(newCache))
	}
	return nil
}

func (s *waterThresholdService) StartCron(ctx context.Context) {
	go func() {
		for {
			now := time.Now()
			// Tính thời gian chờ đến 00:00:00 ngày tiếp theo
			nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
			duration := time.Until(nextMidnight)

			select {
			case <-ctx.Done():
				return
			case <-time.After(duration):
				if s.logger != nil {
					s.logger.GetLogger().Info("[WaterThresholdService] Daily 00:00 Cron Triggered: reloading cache...")
				}
				_ = s.ReloadCache(context.Background())
			}
		}
	}()
}

func (s *waterThresholdService) GetActiveSetting(ctx context.Context, year int) (*models.WaterThresholdSetting, error) {
	if year == 0 {
		year = time.Now().Year()
	}

	s.mu.RLock()
	item, ok := s.activeCache[year]
	s.mu.RUnlock()

	if ok && item != nil {
		return item, nil
	}

	// Cache miss -> load from DB
	active, err := s.repo.GetActive(ctx, year)
	if err != nil {
		return nil, err
	}

	if active != nil {
		s.mu.Lock()
		s.activeCache[year] = active
		s.mu.Unlock()
		return active, nil
	}

	// Fallback to latest active if current year has no active setting
	latest, err := s.repo.GetLatestActive(ctx)
	if err != nil {
		return nil, err
	}
	return latest, nil
}

func (s *waterThresholdService) GetLatestActiveSetting(ctx context.Context) (*models.WaterThresholdSetting, error) {
	return s.GetActiveSetting(ctx, time.Now().Year())
}

func (s *waterThresholdService) ListSettings(ctx context.Context, year int, status string) ([]*models.WaterThresholdSetting, error) {
	return s.repo.List(ctx, year, status)
}

func (s *waterThresholdService) CreateSetting(ctx context.Context, setting *models.WaterThresholdSetting, user *models.User) (*models.WaterThresholdSetting, error) {
	if setting.Year <= 0 {
		setting.Year = time.Now().Year()
	}

	maxVersion, err := s.repo.GetMaxVersion(ctx, setting.Year)
	if err != nil {
		return nil, err
	}

	setting.Version = maxVersion + 1
	setting.Status = "new"
	if user != nil {
		setting.CreatedByID = user.ID
		setting.CreatedByName = user.Name
		if setting.CreatedByName == "" {
			setting.CreatedByName = user.Username
		}
	}
	setting.Ctime = time.Now()
	setting.Utime = time.Now()

	if err := s.repo.Create(ctx, setting); err != nil {
		return nil, err
	}
	return setting, nil
}

func (s *waterThresholdService) ActivateSetting(ctx context.Context, id string, user *models.User) (*models.WaterThresholdSetting, error) {
	setting, err := s.repo.GetByID(ctx, id)
	if err != nil || setting == nil {
		return nil, err
	}

	// Archive all existing active settings for this year
	if err := s.repo.ArchiveAllActive(ctx, setting.Year); err != nil {
		return nil, err
	}

	// Activate target setting
	now := time.Now()
	setting.Status = "active"
	setting.ActivatedTime = &now
	if user != nil {
		setting.ActivatedByID = user.ID
		setting.ActivatedByName = user.Name
		if setting.ActivatedByName == "" {
			setting.ActivatedByName = user.Username
		}
	}

	if err := s.repo.Update(ctx, setting); err != nil {
		return nil, err
	}

	// Immediate Cache Reload
	_ = s.ReloadCache(ctx)

	return setting, nil
}

// CalculateThresholdStatus: Auto-binding helper logic
func (s *waterThresholdService) CalculateThresholdStatus(ctx context.Context, timestamp time.Time, stationConfigs []models.StationThresholdConfig, value float64) (status string, min float64, max float64) {
	status = "normal"
	min = 0
	max = 0

	if len(stationConfigs) == 0 {
		return status, min, max
	}

	// 1. Get Active Setting for timestamp's year
	year := timestamp.Year()
	activeSetting, err := s.GetActiveSetting(ctx, year)
	if err != nil || activeSetting == nil || len(activeSetting.Thresholds) == 0 {
		return status, min, max
	}

	// 2. Find SeasonType for timestamp's month
	month := int(timestamp.Month())
	var matchedSeasonType models.SeasonType

	for _, th := range activeSetting.Thresholds {
		for _, m := range th.Months {
			if m == month {
				matchedSeasonType = th.Type
				break
			}
		}
		if matchedSeasonType != "" {
			break
		}
	}

	if matchedSeasonType == "" {
		return status, min, max
	}

	// 3. Find matching StationThresholdConfig for matchedSeasonType
	var matchedConfig *models.StationThresholdConfig
	for _, cfg := range stationConfigs {
		if cfg.ThresholdType == matchedSeasonType {
			matchedConfig = &cfg
			break
		}
	}

	if matchedConfig == nil {
		return status, min, max
	}

	min = matchedConfig.MinLevel
	max = matchedConfig.MaxLevel

	// 4. Compare value against min and max
	if value > max && max > 0 {
		status = "high"
	} else if value < min && min > 0 {
		status = "low"
	} else {
		status = "normal"
	}

	return status, min, max
}
