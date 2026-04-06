package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/models"
	"context"
)

type Permission interface {
	mgo.BaseTable
	GetAll(ctx context.Context) ([]*models.Permission, error)
	Upsert(ctx context.Context, p *models.Permission) error
}

type RolePermission interface {
	mgo.BaseTable
	GetByRole(ctx context.Context, role string) (*models.RolePermission, error)
	Update(ctx context.Context, role string, permissions []string) error
	GetMatrix(ctx context.Context) ([]*models.RolePermission, error)
}
