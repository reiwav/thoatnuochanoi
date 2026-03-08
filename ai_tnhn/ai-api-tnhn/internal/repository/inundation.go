package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type Inundation interface {
	mgo.BaseTable
	Create(ctx context.Context, report *models.InundationReport) error
	GetByID(ctx context.Context, id string) (*models.InundationReport, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.InundationReport, int64, error)
	UpdateStatus(ctx context.Context, id string, status string) error
	Resolve(ctx context.Context, id string, endTime int64) error
}

type InundationUpdate interface {
	mgo.BaseTable
	Create(ctx context.Context, update *models.InundationUpdate) error
	ListByReportID(ctx context.Context, reportID string) ([]*models.InundationUpdate, error)
}
