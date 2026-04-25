package query

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *service) Query(ctx context.Context, collectionName string, filter map[string]interface{}, limit int64) ([]map[string]interface{}, error) {
	restrictedCollections := map[string]bool{
		"tokens": true,
		"users":  true,
	}

	if restrictedCollections[collectionName] {
		return nil, fmt.Errorf("truy cập vào bộ sưu tập '%s' bị từ chối vì lý do bảo mật", collectionName)
	}

	if limit <= 0 || limit > 100 {
		limit = 100
	}

	coll := s.db.Collection(collectionName)

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

	for i := range results {
		delete(results[i], "password")
		delete(results[i], "token")
	}

	return results, nil
}
