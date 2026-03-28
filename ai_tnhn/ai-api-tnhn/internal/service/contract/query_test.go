package contract

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"testing"
)

type mockRepo struct{}

func (m *mockRepo) Upsert(ctx context.Context, contract *models.Contract) error { return nil }
func (m *mockRepo) Delete(ctx context.Context, id string) error             { return nil }
func (m *mockRepo) GetByID(ctx context.Context, id string) (*models.Contract, error) {
	return &models.Contract{}, nil
}
func (m *mockRepo) List(ctx context.Context, f filter.Filter) ([]*models.Contract, int64, error) {
	// Ensure f is not nil - this is where the panic would happen if passed to R_SearchAndCount
	if f == nil {
		panic("Filter is nil in List()")
	}
	return []*models.Contract{}, 0, nil
}

func TestGetContractSummary_NoPanic(t *testing.T) {
	svc := &service{
		repo: &mockRepo{},
	}

	_, err := svc.GetContractSummary(context.Background())
	if err != nil {
		t.Errorf("GetContractSummary failed: %v", err)
	}
}

func TestGetStagesDueSoon_NoPanic(t *testing.T) {
	svc := &service{
		repo: &mockRepo{},
	}

	_, err := svc.GetStagesDueSoon(context.Background(), 30)
	if err != nil {
		t.Errorf("GetStagesDueSoon failed: %v", err)
	}
}
