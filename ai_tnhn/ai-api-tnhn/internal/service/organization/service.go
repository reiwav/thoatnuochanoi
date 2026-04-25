package organization

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
)

type Service interface {
	Create(ctx context.Context, org *models.Organization) error
	Update(ctx context.Context, id string, org *models.Organization) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.Organization, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.Organization, int64, error)
	FindAll(ctx context.Context, page, limit int) ([]*models.Organization, int64, error)
	GetPrimaryAndShared(ctx context.Context, userID string) (primaryOrgs []*models.Organization, sharedOrgs []*models.Organization, err error)
}

type service struct {
	orgRepo  repository.Organization
	userRepo repository.User
	driveSvc googledrive.Service
}

func NewService(orgRepo repository.Organization, userRepo repository.User, driveSvc googledrive.Service) Service {
	return &service{
		orgRepo:  orgRepo,
		userRepo: userRepo,
		driveSvc: driveSvc,
	}
}
