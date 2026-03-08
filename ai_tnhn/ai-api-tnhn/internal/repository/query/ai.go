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

type aiUsageRepository struct {
	*db.Table
}

func NewAiUsageRepo(dbc *mongo.Database, name, prefix string, l logger.Logger) repository.AiUsage {
	return aiUsageRepository{db.NewTable(name, prefix, dbc, l)}
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
