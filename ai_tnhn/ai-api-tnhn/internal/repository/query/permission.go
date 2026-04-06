package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type permissionRepository struct {
	*db.Table
}

func NewPermissionRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.Permission {
	return permissionRepository{db.NewTable(name, prefix, dbc, l)}
}

func (r permissionRepository) GetAll(ctx context.Context) ([]*models.Permission, error) {
	var list []*models.Permission
	err := r.R_SelectMany(ctx, bson.M{"deleted_at": 0}, &list)
	return list, err
}

func (r permissionRepository) Upsert(ctx context.Context, p *models.Permission) error {
	filter := bson.M{"code": p.Code, "deleted_at": 0}
	var existing *models.Permission
	err := r.R_SelectOne(ctx, filter, &existing)
	if err != nil && err != mongo.ErrNoDocuments {
		return err
	}
	if existing != nil {
		p.ID = existing.ID
		p.CTime = existing.CTime
		p.BeforeUpdate()
		_, err = r.UpdateOne(ctx, filter, bson.M{"$set": p})
		return err
	}
	p.BeforeCreate("perm")
	return r.R_Create(ctx, p)
}

type rolePermissionRepository struct {
	*db.Table
}

func NewRolePermissionRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.RolePermission {
	return rolePermissionRepository{db.NewTable(name, prefix, dbc, l)}
}

func (r rolePermissionRepository) GetByRole(ctx context.Context, role string) (*models.RolePermission, error) {
	var m *models.RolePermission
	err := r.R_SelectOne(ctx, bson.M{"role": role, "deleted_at": 0}, &m)
	return m, err
}

func (r rolePermissionRepository) Update(ctx context.Context, role string, permissions []string) error {
	filter := bson.M{"role": role, "deleted_at": 0}
	var existing *models.RolePermission
	err := r.R_SelectOne(ctx, filter, &existing)
	if err != nil && err != mongo.ErrNoDocuments {
		return err
	}
	if existing != nil {
		existing.Permissions = permissions
		existing.BeforeUpdate()
		_, err = r.UpdateOne(ctx, filter, bson.M{"$set": existing})
		return err
	}
	rp := &models.RolePermission{
		Role:        role,
		Permissions: permissions,
	}
	rp.BeforeCreate("rp")
	return r.R_Create(ctx, rp)
}

func (r rolePermissionRepository) GetMatrix(ctx context.Context) ([]*models.RolePermission, error) {
	var list []*models.RolePermission
	err := r.R_SelectMany(ctx, bson.M{"deleted_at": 0}, &list)
	return list, err
}
