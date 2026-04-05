package repository

import (
	"ai-api-tnhn/internal/models"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type AiUsage interface {
	Save(ctx context.Context, usage *models.AiUsage) error
	GetAggregateStats(ctx context.Context, filter bson.M) (map[string]interface{}, error)
}

type AiChatLog interface {
	Save(ctx context.Context, log *models.AiChatLog) error
	FindByUser(ctx context.Context, userID string, chatType string, limit int, before time.Time) ([]models.AiChatLog, error)
}

