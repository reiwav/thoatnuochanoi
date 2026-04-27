package role

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

type Service interface {
	GetAll(ctx context.Context, currentUserRole string) ([]models.Role, error)
	GetByCode(ctx context.Context, code string) (*models.Role, error)
	Create(ctx context.Context, role *models.Role) error
	Update(ctx context.Context, id string, role *models.Role) error
	Delete(ctx context.Context, id string) error
}

type service struct {
	roleRepo repository.Role
}

func NewService(roleRepo repository.Role) Service {
	return &service{
		roleRepo: roleRepo,
	}
}
