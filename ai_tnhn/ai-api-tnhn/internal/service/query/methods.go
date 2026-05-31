package query

import (
	"context"
	"encoding/json"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *service) Query(ctx context.Context, collectionName string, filter map[string]interface{}, limit int64) ([]map[string]interface{}, error) {
	restrictedCollections := map[string]bool{
		"tokens":           true,
		"users":            true,
		"settings":         true,
		"role_permissions": true,
		"permissions":      true,
		"roles":            true,
		"ai_usage_records": true,
		"ai_chat_logs":     true,
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

	if collectionName == "inundation_reports" {
		bsonFilter["has_flooded"] = true
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

func (s *service) Aggregate(ctx context.Context, collectionName string, pipeline interface{}) ([]map[string]interface{}, error) {
	restrictedCollections := map[string]bool{
		"tokens":           true,
		"users":            true,
		"settings":         true,
		"role_permissions": true,
		"permissions":      true,
		"roles":            true,
		"ai_usage_records": true,
		"ai_chat_logs":     true,
	}

	if restrictedCollections[collectionName] {
		return nil, fmt.Errorf("truy cập vào bộ sưu tập '%s' bị từ chối vì lý do bảo mật", collectionName)
	}

	// Safety check: Prevent pipeline from modifying/writing to the database (blocking $out and $merge)
	pipelineBytes, err := json.Marshal(pipeline)
	if err == nil {
		var stages []bson.M
		if err := json.Unmarshal(pipelineBytes, &stages); err == nil {
			for _, stage := range stages {
				for k := range stage {
					if k == "$out" || k == "$merge" {
						return nil, fmt.Errorf("phép toán ghi/sửa đổi '%s' bị nghiêm cấm vì lý do an toàn dữ liệu", k)
					}
				}
			}
		}
	}

	coll := s.db.Collection(collectionName)

	cursor, err := coll.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi thực hiện aggregation: %w", err)
	}
	defer cursor.Close(ctx)

	var results []map[string]interface{}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("lỗi khi giải mã kết quả aggregation: %w", err)
	}

	for i := range results {
		delete(results[i], "password")
		delete(results[i], "token")
	}

	return results, nil
}
