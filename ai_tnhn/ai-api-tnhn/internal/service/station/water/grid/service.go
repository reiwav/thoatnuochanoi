package grid

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station/water/dto"
	"ai-api-tnhn/internal/service/station/water/records"
	"context"
	"time"
)

// Service defines operations for grid and manual water record data entry
type Service interface {
	UpsertSingleWaterRecord(ctx context.Context, input *dto.SingleWaterRecordInput, user *models.User) (string, error)
	GetGridDataByTimeRange(ctx context.Context, startTime, endTime time.Time, date string) ([]dto.GridDataResponseItem, error)
}

type service struct {
	lakeRepo   repository.Lake
	riverRepo  repository.River
	recordsSvc records.Service
}

// NewService constructs a new grid service instance
func NewService(
	lake repository.Lake,
	river repository.River,
	recordsSvc records.Service,
) Service {
	return &service{
		lakeRepo:   lake,
		riverRepo:  river,
		recordsSvc: recordsSvc,
	}
}
