package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type InundationReport interface {
	mgo.BaseTable
	Create(ctx context.Context, report *models.InundationReport) error
	GetByID(ctx context.Context, id string) (*models.InundationReport, error)
	GetByIDs(ctx context.Context, ids []string) ([]*models.InundationReport, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.InundationReport, int64, error)
	//UpdateStatus(ctx context.Context, id string, status string) error
	Resolve(ctx context.Context, id string, endTime int64) error
	Update(ctx context.Context, report *models.InundationReport) error
	ListByYear(ctx context.Context, orgID string, year int, pointIDs []string) ([]*models.InundationReport, error)
	ListByDateRange(ctx context.Context, startDate, endDate string, pointID string) ([]*models.InundationReport, error)
}

type InundationHistory interface {
	mgo.BaseTable
	Create(ctx context.Context, history *models.InundationHistory) error
	GetByID(ctx context.Context, id string) (*models.InundationHistory, error)
	GetByIDs(ctx context.Context, ids []string) ([]*models.InundationHistory, error)
	Update(ctx context.Context, history *models.InundationHistory) error
	ListByReportID(ctx context.Context, reportID string) ([]*models.InundationHistory, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.InundationHistory, int64, error)
}
