package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/mongo"
)

type sluiceGateRepository struct {
	gateTable    *db.Table
	historyTable *db.Table
}

func NewSluiceGateRepo(dbc *mongo.Database, l logger.Logger) repository.SluiceGate {
	return sluiceGateRepository{
		gateTable:    db.NewTable("sluice_gates", "sg", dbc, l),
		historyTable: db.NewTable("sluice_gate_history", "sgh", dbc, l),
	}
}

func (r sluiceGateRepository) Create(ctx context.Context, m *models.SluiceGate) (*models.SluiceGate, error) {
	return m, r.gateTable.R_Create(ctx, m)
}

func (r sluiceGateRepository) Get(ctx context.Context, id string) (*models.SluiceGate, error) {
	var m *models.SluiceGate
	err := r.gateTable.R_SelectByID(ctx, id, &m)
	return m, err
}

func (r sluiceGateRepository) Update(ctx context.Context, id string, m *models.SluiceGate) error {
	m.ID = id
	return r.gateTable.R_Update(ctx, m)
}

func (r sluiceGateRepository) Delete(ctx context.Context, id string) error {
	return r.gateTable.R_DeleteByID(ctx, id)
}

func (r sluiceGateRepository) List(ctx context.Context, f filter.Filter) ([]*models.SluiceGate, int64, error) {
	var items []*models.SluiceGate
	total, err := r.gateTable.R_SearchAndCount(ctx, f, &items)
	return items, total, err
}

func (r sluiceGateRepository) CreateHistory(ctx context.Context, m *models.SluiceGateHistory) error {
	return r.historyTable.R_Create(ctx, m)
}

func (r sluiceGateRepository) ListHistory(ctx context.Context, f filter.Filter) ([]*models.SluiceGateHistory, int64, error) {
	var items []*models.SluiceGateHistory
	total, err := r.historyTable.R_SearchAndCount(ctx, f, &items)
	return items, total, err
}
