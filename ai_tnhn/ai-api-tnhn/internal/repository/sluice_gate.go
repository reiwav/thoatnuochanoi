package repository

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
)

type SluiceGate interface {
	Create(ctx context.Context, m *models.SluiceGate) (*models.SluiceGate, error)
	Get(ctx context.Context, id string) (*models.SluiceGate, error)
	Update(ctx context.Context, id string, m *models.SluiceGate) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filter filter.Filter) ([]*models.SluiceGate, int64, error)
	
	// History
	CreateHistory(ctx context.Context, m *models.SluiceGateHistory) error
	ListHistory(ctx context.Context, filter filter.Filter) ([]*models.SluiceGateHistory, int64, error)
}
