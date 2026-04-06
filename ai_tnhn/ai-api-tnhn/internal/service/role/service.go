package role

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

type Service interface {
	GetAll(ctx context.Context) ([]*models.Role, error)
	GetByCode(ctx context.Context, code string) (*models.Role, error)
	Create(ctx context.Context, role *models.Role) error
	Update(ctx context.Context, id string, role *models.Role) error
	Delete(ctx context.Context, id string) error
}

func NewService(roleRepo repository.Role) Service {
	return &service{
		roleRepo: roleRepo,
	}
}

type service struct {
	roleRepo repository.Role
}

func (s *service) GetAll(ctx context.Context) ([]*models.Role, error) {
	return s.roleRepo.GetAll(ctx)
}

func (s *service) GetByCode(ctx context.Context, code string) (*models.Role, error) {
	return s.roleRepo.GetByCode(ctx, code)
}

func (s *service) Create(ctx context.Context, role *models.Role) error {
	return s.roleRepo.Create(ctx, role)
}

func (s *service) Update(ctx context.Context, id string, role *models.Role) error {
	return s.roleRepo.Update(ctx, id, role)
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.roleRepo.Delete(ctx, id)
}
