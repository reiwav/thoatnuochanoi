package query

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/base/mgo/db"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type aiUsageRepository struct {
	*db.Table
}

type aiChatLogRepository struct {
	*db.Table
}


func NewAiUsageRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.AiUsage {
	return aiUsageRepository{db.NewTable(name, prefix, dbc, l)}
}

func NewAiChatLogRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.AiChatLog {
	return aiChatLogRepository{db.NewTable(name, prefix, dbc, l)}
}


func (p aiUsageRepository) Save(ctx context.Context, usage *models.AiUsage) error {
	return p.R_Create(ctx, usage)
}

func (p aiUsageRepository) GetAggregateStats(ctx context.Context, filter bson.M) (map[string]interface{}, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: nil},
			{Key: "total_prompt_tokens", Value: bson.D{{Key: "$sum", Value: "$prompt_tokens"}}},
			{Key: "total_candidate_tokens", Value: bson.D{{Key: "$sum", Value: "$candidate_tokens"}}},
			{Key: "total_tokens", Value: bson.D{{Key: "$sum", Value: "$total_tokens"}}},
			{Key: "request_count", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
	}

	cursor, err := p.Collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []map[string]interface{}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return map[string]interface{}{
			"total_prompt_tokens":    0,
			"total_candidate_tokens": 0,
			"total_tokens":           0,
			"request_count":          0,
		}, nil
	}

	return results[0], nil
}

func (p aiChatLogRepository) Save(ctx context.Context, log *models.AiChatLog) error {
	return p.R_Create(ctx, log)
}

func (p aiChatLogRepository) FindByUser(ctx context.Context, userID string, chatType string, limit int, before time.Time) ([]models.AiChatLog, error) {
	if limit == 0 {
		limit = 50
	}
	f := bson.M{"user_id": userID}
	if chatType != "" {
		f["chat_type"] = chatType
	}
	if !before.IsZero() {
		f["timestamp"] = bson.M{"$lt": before}
	}
	var results []models.AiChatLog
	err := p.R_SelectAndSort(ctx, f, bson.M{"timestamp": -1}, 0, int64(limit), &results)
	return results, err
}

