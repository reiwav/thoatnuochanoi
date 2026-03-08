package query

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
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

func (s *service) Query(ctx context.Context, collectionName string, filter map[string]interface{}, limit int64) ([]map[string]interface{}, error) {
	// 1. Safety Restrictions
	restrictedCollections := map[string]bool{
		"tokens": true,
		"users":  true, // Although some user info is fine, it's safer to block the whole collection or filter fields
	}

	if restrictedCollections[collectionName] {
		return nil, fmt.Errorf("truy cập vào bộ sưu tập '%s' bị từ chối vì lý do bảo mật", collectionName)
	}

	// 2. Enforce Limit
	if limit <= 0 || limit > 100 {
		limit = 100 // Reasonable default maximum
	}

	coll := s.db.Collection(collectionName)

	// Convert map filter to BSON
	bsonFilter := bson.M{}
	for k, v := range filter {
		bsonFilter[k] = v
	}

	opts := options.Find().SetLimit(limit)
	cursor, err := coll.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi thực hiện truy vấn: %w", err)
	}
	defer cursor.Close(ctx)

	var results []map[string]interface{}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("lỗi khi giải mã kết quả: %w", err)
	}

	// 3. Post-process to remove sensitive fields if any (just in case)
	for i := range results {
		delete(results[i], "password")
		delete(results[i], "token")
	}

	return results, nil
}
