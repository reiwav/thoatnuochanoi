package query

import (
	"context"

	"go.mongodb.org/mongo-driver/mongo"
)

type Service interface {
	Query(ctx context.Context, collectionName string, filter map[string]interface{}, limit int64) ([]map[string]interface{}, error)
}

type service struct {
	db *mongo.Database
}

func NewService(db *mongo.Database) Service {
	return &service{db: db}
}
