package records

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/setting"
	"ai-api-tnhn/internal/service/station"
	"context"
)

// Service defines operations for managing lake and river water level records
type Service interface {
	GetLakeDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error)
	GetRiverDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error)
	GetLakeDataByDate(ctx context.Context, date string) ([]*models.LakeRecord, error)
	GetRiverDataByDate(ctx context.Context, date string) ([]*models.RiverRecord, error)
	CreateLakeRecord(ctx context.Context, record *models.LakeRecord, user *models.User) error
	CreateRiverRecord(ctx context.Context, record *models.RiverRecord, user *models.User) error
}

type service struct {
	lakeRepo          repository.Lake
	riverRepo         repository.River
	stationSvc        station.Service
	waterThresholdSvc setting.WaterThresholdService
	logger            logger.Logger
}

// NewService constructs a new record service instance for lake and river
func NewService(
	l logger.Logger,
	lake repository.Lake,
	river repository.River,
	stationSvc station.Service,
	waterThresholdSvc setting.WaterThresholdService,
) Service {
	return &service{
		lakeRepo:          lake,
		riverRepo:         river,
		stationSvc:        stationSvc,
		waterThresholdSvc: waterThresholdSvc,
		logger:            l,
	}
}
