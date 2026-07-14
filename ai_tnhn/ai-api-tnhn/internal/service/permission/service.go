package permission

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"sync"
)

type Service interface {
	GetMatrix(ctx context.Context) ([]*models.RolePermission, []*models.Permission, error)
	UpdateMatrix(ctx context.Context, role string, permissions []string) error
	GetPermissionsByRole(ctx context.Context, role string) ([]string, error)
	SeedPermissions(ctx context.Context, perms []models.Permission) error
	RegisterOnRoleUpdate(cb func(role string))
}

type service struct {
	permRepo     repository.Permission
	rolePermRepo repository.RolePermission
	onRoleUpdate []func(role string)
	mu           sync.Mutex
}

func NewService(permRepo repository.Permission, rolePermRepo repository.RolePermission) Service {
	return &service{
		permRepo:     permRepo,
		rolePermRepo: rolePermRepo,
	}
}
