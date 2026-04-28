package sluice_gate

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

type Service interface {
	Create(ctx context.Context, m *models.SluiceGate) (*models.SluiceGate, error)
	Get(ctx context.Context, id string) (*models.SluiceGate, error)
	Update(ctx context.Context, id string, m *models.SluiceGate) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, f filter.Filter) ([]*models.SluiceGate, int64, error)
	
	Report(ctx context.Context, id string, m *models.SluiceGateHistory) error
	ListHistory(ctx context.Context, id string, f filter.Filter) ([]*models.SluiceGateHistory, int64, error)
}

type service struct {
	repo repository.SluiceGate
}

func NewService(repo repository.SluiceGate) Service {
	return &service{repo: repo}
}

func (s *service) Create(ctx context.Context, m *models.SluiceGate) (*models.SluiceGate, error) {
	return s.repo.Create(ctx, m)
}

func (s *service) Get(ctx context.Context, id string) (*models.SluiceGate, error) {
	return s.repo.Get(ctx, id)
}

func (s *service) Update(ctx context.Context, id string, m *models.SluiceGate) error {
	return s.repo.Update(ctx, id, m)
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *service) List(ctx context.Context, f filter.Filter) ([]*models.SluiceGate, int64, error) {
	return s.repo.List(ctx, f)
}

func (s *service) Report(ctx context.Context, id string, m *models.SluiceGateHistory) error {
	m.SluiceGateID = id
	return s.repo.CreateHistory(ctx, m)
}

func (s *service) ListHistory(ctx context.Context, id string, f filter.Filter) ([]*models.SluiceGateHistory, int64, error) {
	f.AddWhere("sluice_gate_id", "=", id)
	return s.repo.ListHistory(ctx, f)
}
