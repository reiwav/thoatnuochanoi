package role

import (
	"ai-api-tnhn/internal/models"
	"context"
)

func (s *service) GetAll(ctx context.Context, currentUserRole string) ([]models.Role, error) {
	allRoles, err := s.roleRepo.GetAll(ctx)
	if err != nil {
		return nil, err
	}

	if currentUserRole == "super_admin" {
		return allRoles, nil
	}

	currentInfo, err := s.roleRepo.GetByCode(ctx, currentUserRole)
	if err != nil || currentInfo == nil {
		return []models.Role{}, nil
	}

	var filtered []models.Role
	for _, r := range allRoles {
		if r.Level < currentInfo.Level {
			continue
		}
		if r.Group == "" || r.Group == currentInfo.Group {
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
