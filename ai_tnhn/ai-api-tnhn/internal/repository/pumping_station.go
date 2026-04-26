package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type PumpingStation interface {
	mgo.BaseTable
	GetByID(ctx context.Context, id string) (*models.PumpingStation, error)
	Create(ctx context.Context, input *models.PumpingStation) (*models.PumpingStation, error)
	Update(ctx context.Context, id string, input *models.PumpingStation) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filter filter.Filter) ([]*models.PumpingStation, int64, error)

	// History
	CreateHistory(ctx context.Context, history *models.PumpingStationHistory) (*models.PumpingStationHistory, error)
	UpdateHistory(ctx context.Context, history *models.PumpingStationHistory) error
	ListHistory(ctx context.Context, filter filter.Filter) ([]*models.PumpingStationHistory, int64, error)
}
