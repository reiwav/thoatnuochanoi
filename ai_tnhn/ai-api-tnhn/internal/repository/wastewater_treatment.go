package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type WastewaterStation interface {
	mgo.BaseTable
	GetByID(ctx context.Context, id string) (*models.WastewaterStation, error)
	Create(ctx context.Context, input *models.WastewaterStation) (*models.WastewaterStation, error)
	Update(ctx context.Context, id string, input *models.WastewaterStation) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filter filter.Filter) ([]*models.WastewaterStation, int64, error)
	ListFiltered(ctx context.Context, orgID string, ids []string) ([]*models.WastewaterStation, error)

	// Reports (History)
	CreateReport(ctx context.Context, report *models.WastewaterStationReport) (*models.WastewaterStationReport, error)
	ListReports(ctx context.Context, filter filter.Filter) ([]*models.WastewaterStationReport, int64, error)
}
