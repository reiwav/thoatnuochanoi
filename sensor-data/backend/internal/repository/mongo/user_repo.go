package mongo

import (
	"context"
	"sensor-backend/internal/models"
	"sensor-backend/internal/repository"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type userRepo struct {
	coll *mongo.Collection
}

func NewUserRepo(db *mongo.Database) repository.UserRepository {
	return &userRepo{
		coll: db.Collection("users"),
	}
}

func (r *userRepo) FindByName(ctx context.Context, username string) (*models.User, error) {
	var user models.User
	err := r.coll.FindOne(ctx, bson.M{"username": username}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) Insert(ctx context.Context, user *models.User) error {
	_, err := r.coll.InsertOne(ctx, user)
	return err
}
