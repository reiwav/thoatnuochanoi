package contract_category

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
)

type Service interface {
	Create(ctx context.Context, category *models.ContractCategory) error
	Update(ctx context.Context, id string, category *models.ContractCategory) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.ContractCategory, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.ContractCategory, int64, error)
	GetTree(ctx context.Context) ([]*models.ContractCategory, error)
}

type service struct {
	repo     repository.ContractCategory
	driveSvc googledrive.Service
}

func NewService(repo repository.ContractCategory, driveSvc googledrive.Service) Service {
	return &service{repo: repo, driveSvc: driveSvc}
}
