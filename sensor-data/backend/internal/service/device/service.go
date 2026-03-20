package device

import (
	"context"
	"errors"
	"sensor-backend/internal/models"
	"sensor-backend/internal/repository"
	"sync"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Service interface {
	LoadCache(ctx context.Context) error
	GetDevices() []models.Device
	UpdateDeviceConfig(ctx context.Context, id string, config []models.DeviceConfig) error
}

type service struct {
	repo    repository.DeviceRepository
	cache   []models.Device
	cacheMu sync.RWMutex
}

func NewService(repo repository.DeviceRepository) Service {
	return &service{repo: repo}
}

func (s *service) LoadCache(ctx context.Context) error {
	devices, err := s.repo.FindAll(ctx)
	if err != nil {
		return err
	}
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()
	s.cache = devices
	return nil
}

func (s *service) GetDevices() []models.Device {
	s.cacheMu.RLock()
	defer s.cacheMu.RUnlock()
	return s.cache
}

func (s *service) UpdateDeviceConfig(ctx context.Context, id string, config []models.DeviceConfig) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	// Update DB
	err = s.repo.UpdateConfig(ctx, oid, config)
	if err != nil {
		return err
	}

	// Update Cache
	s.cacheMu.Lock()
	defer s.cacheMu.Unlock()
	for i, d := range s.cache {
		if d.ID == oid {
			s.cache[i].Config = config
			return nil
		}
	}

	return errors.New("device not found in cache")
}
