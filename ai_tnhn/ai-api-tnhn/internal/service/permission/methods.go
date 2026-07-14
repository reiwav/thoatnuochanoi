package permission

import (
	"ai-api-tnhn/internal/models"
	"context"
)

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
	err := s.rolePermRepo.Update(ctx, role, permissions)
	if err != nil {
		return err
	}

	s.mu.Lock()
	callbacks := make([]func(role string), len(s.onRoleUpdate))
	copy(callbacks, s.onRoleUpdate)
	s.mu.Unlock()
	for _, cb := range callbacks {
		cb(role)
	}

	return nil
}

func (s *service) RegisterOnRoleUpdate(cb func(role string)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onRoleUpdate = append(s.onRoleUpdate, cb)
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
