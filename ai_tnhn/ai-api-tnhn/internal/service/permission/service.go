package permission

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

type Service interface {
	GetMatrix(ctx context.Context) ([]*models.RolePermission, []*models.Permission, error)
	UpdateMatrix(ctx context.Context, role string, permissions []string) error
	GetPermissionsByRole(ctx context.Context, role string) ([]string, error)
	SeedPermissions(ctx context.Context, perms []models.Permission) error
}

func NewService(permRepo repository.Permission, rolePermRepo repository.RolePermission) Service {
	return &service{
		permRepo:     permRepo,
		rolePermRepo: rolePermRepo,
	}
}

type service struct {
	permRepo     repository.Permission
	rolePermRepo repository.RolePermission
}

func (s *service) GetMatrix(ctx context.Context) ([]*models.RolePermission, []*models.Permission, error) {
	roles, err := s.rolePermRepo.GetMatrix(ctx)
	if err != nil {
		return nil, nil, err
	}
	perms, err := s.permRepo.GetAll(ctx)
	if err != nil {
		return nil, nil, err
	}
	return roles, perms, nil
}

func (s *service) UpdateMatrix(ctx context.Context, role string, permissions []string) error {
	return s.rolePermRepo.Update(ctx, role, permissions)
}

func (s *service) GetPermissionsByRole(ctx context.Context, role string) ([]string, error) {
	rp, err := s.rolePermRepo.GetByRole(ctx, role)
	if err != nil {
		return nil, err
	}
	if rp == nil {
		return []string{}, nil
	}
	return rp.Permissions, nil
}

func (s *service) SeedPermissions(ctx context.Context, perms []models.Permission) error {
	for _, p := range perms {
		if err := s.permRepo.Upsert(ctx, &p); err != nil {
			return err
		}
	}
	return nil
}
