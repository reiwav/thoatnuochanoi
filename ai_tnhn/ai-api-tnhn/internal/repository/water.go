package repository

import (
	"ai-api-tnhn/internal/models"
	"context"

	"go.mongodb.org/mongo-driver/bson"
)

type Rain interface {
	GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RainRecord, error)
	GetByDate(ctx context.Context, date string) ([]*models.RainRecord, error)
	GetLatest(ctx context.Context, stationID int64) (*models.RainRecord, error)
	GetAggregateStats(ctx context.Context, filter bson.M, groupBy string) ([]map[string]interface{}, error)
	Create(ctx context.Context, record *models.RainRecord) error
}

type Lake interface {
	GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error)
	GetByDate(ctx context.Context, date string) ([]*models.LakeRecord, error)
	GetLatest(ctx context.Context, stationID int64) (*models.LakeRecord, error)
	Create(ctx context.Context, record *models.LakeRecord) error
}

type River interface {
	GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error)
	GetByDate(ctx context.Context, date string) ([]*models.RiverRecord, error)
	GetLatest(ctx context.Context, stationID int64) (*models.RiverRecord, error)
	Create(ctx context.Context, record *models.RiverRecord) error
}
