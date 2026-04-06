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

type roleRepository struct {
	*db.Table
}

func NewRoleRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.Role {
	return roleRepository{db.NewTable(name, prefix, dbc, l)}
}

func (r roleRepository) GetAll(ctx context.Context) ([]*models.Role, error) {
	var list []*models.Role
	err := r.R_SelectMany(ctx, bson.M{"deleted_at": 0}, &list)
	return list, err
}

func (r roleRepository) GetByCode(ctx context.Context, code string) (*models.Role, error) {
	var m *models.Role
	err := r.R_SelectOne(ctx, bson.M{"code": code, "deleted_at": 0}, &m)
	return m, err
}

func (r roleRepository) Create(ctx context.Context, role *models.Role) error {
	role.BeforeCreate("role")
	return r.R_Create(ctx, role)
}

func (r roleRepository) Update(ctx context.Context, id string, role *models.Role) error {
	role.BeforeUpdate()
	_, err := r.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": role})
	return err
}

func (r roleRepository) Delete(ctx context.Context, id string) error {
	_, err := r.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{"deleted_at": 1}})
	return err
}
