package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/utils/hash"
	"ai-api-tnhn/utils/web"
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type userRepository struct {
	*db.Table
}

func NewUserRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.User {
	return userRepository{db.NewTable(name, prefix, dbc, l)}
}

func (p userRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	var m *models.User
	return m, p.R_SelectByID(ctx, id, &m)
}

func (p userRepository) Create(ctx context.Context, input *models.User) (*models.User, error) {
	var u *models.User
	_ = p.R_SelectOne(ctx, bson.M{
		"email": input.Email,
	}, &u)
	if u != nil {
		return nil, web.BadRequest("user existed")
	}

	str, _ := input.Password.GererateHashedPassword()
	input.Password = hash.NewPassword(str)
	return input, p.R_Create(ctx, input)
}

func (p userRepository) Update(ctx context.Context, id string, input *models.User) error {
	input.ID = id
	return p.R_Update(ctx, input)
}

func (p userRepository) Delete(ctx context.Context, id string) error {
	return p.R_DeleteByID(ctx, id)
}

func (p userRepository) List(ctx context.Context, filter filter.Filter) ([]*models.User, int64, error) {
	var users []*models.User
	total, err := p.R_SearchAndCount(ctx, filter, &users)
	return users, total, err
}
