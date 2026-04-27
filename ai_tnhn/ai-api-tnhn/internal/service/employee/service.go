package employee

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
)

type Service interface {
	Create(ctx context.Context, input *models.User, currentUserRole string) (*models.User, error)
	Update(ctx context.Context, id string, input *models.User, currentUserRole string) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.User, error)
	List(ctx context.Context, f filter.Filter, currentGroup string) ([]*models.User, int64, error)
}

type service struct {
	userRepo repository.User
	orgRepo  repository.Organization
	roleRepo repository.Role
	driveSvc googledrive.Service
}

func NewService(userRepo repository.User, orgRepo repository.Organization, roleRepo repository.Role, driveSvc googledrive.Service) Service {
	return &service{
		userRepo: userRepo,
		orgRepo:  orgRepo,
		roleRepo: roleRepo,
		driveSvc: driveSvc,
	}
}
