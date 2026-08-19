package repository

import (
	"ai-api-tnhn/internal/models"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type Rain interface {
	GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RainRecord, error)
	GetAllByStationID(ctx context.Context, stationID int64, startTime, endTime time.Time) ([]models.RainRecord, error)
	GetByDate(ctx context.Context, date string) ([]*models.RainRecord, error)
	GetByDateRange(ctx context.Context, startTime, endTime time.Time) ([]*models.RainRecord, error)
	GetLatest(ctx context.Context, stationID int64) (*models.RainRecord, error)
	GetAggregateStats(ctx context.Context, filter bson.M, groupBy string) ([]map[string]interface{}, error)
	Create(ctx context.Context, record *models.RainRecord) error
	Exists(ctx context.Context, stationID int64, timestamp time.Time) (bool, error)
}

type Lake interface {
	GetAllByStationID(ctx context.Context, stationID int64, startTime, endTime time.Time) ([]*models.LakeRecord, error)
	GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error)
	GetByDate(ctx context.Context, date string) ([]*models.LakeRecord, error)
	GetByDateRange(ctx context.Context, startTime, endTime time.Time) ([]*models.LakeRecord, error)
	GetLatest(ctx context.Context, stationID int64) (*models.LakeRecord, error)
	GetLatestBefore(ctx context.Context, stationID int64, startTime time.Time, beforeTime time.Time) (*models.LakeRecord, error)
	Create(ctx context.Context, record *models.LakeRecord) error
	UpdateValueByID(ctx context.Context, id string, value float64, source string) error
	Exists(ctx context.Context, stationID int64, timestamp time.Time) (bool, error)
}

type River interface {
	GetAllByStationID(ctx context.Context, stationID int64, startTime, endTime time.Time) ([]*models.RiverRecord, error)
	GetByStationID(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error)
	GetByDate(ctx context.Context, date string) ([]*models.RiverRecord, error)
	GetByDateRange(ctx context.Context, startTime, endTime time.Time) ([]*models.RiverRecord, error)
	GetLatest(ctx context.Context, stationID int64) (*models.RiverRecord, error)
	GetLatestBefore(ctx context.Context, stationID int64, startTime time.Time, beforeTime time.Time) (*models.RiverRecord, error)
	Create(ctx context.Context, record *models.RiverRecord) error
	UpdateValueByID(ctx context.Context, id string, value float64, source string) error
	Exists(ctx context.Context, stationID int64, timestamp time.Time) (bool, error)
}
