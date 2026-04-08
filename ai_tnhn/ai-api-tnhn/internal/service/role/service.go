package role

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

type Service interface {
	GetAll(ctx context.Context, currentUserRole string) ([]*models.Role, error)
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

func (s *service) GetAll(ctx context.Context, currentUserRole string) ([]*models.Role, error) {
	allRoles, err := s.roleRepo.GetAll(ctx)
	if err != nil {
		return nil, err
	}

	if currentUserRole == "super_admin" {
		return allRoles, nil
	}

	currentInfo, err := s.roleRepo.GetByCode(ctx, currentUserRole)
	if err != nil || currentInfo == nil {
		// If we can't identify the current user's role level, return an empty list for safety
		// or maybe just return all but filter out super_admin.
		return []*models.Role{}, nil
	}

	var filtered []*models.Role
	for _, r := range allRoles {
		if r.Level >= currentInfo.Level {
			filtered = append(filtered, r)
		}
	}

	return filtered, nil
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
