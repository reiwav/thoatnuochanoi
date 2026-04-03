package models

import (
	"ai-api-tnhn/internal/base/model"
	"time"
)

type AiChatLog struct {
	model.BaseModel `bson:",inline"`
	UserID          string    `bson:"user_id" json:"user_id"`
	Role            string    `bson:"role" json:"role"` // "user" or "model"
	Content         string    `bson:"content" json:"content"`
	ChatType        string    `bson:"chat_type" json:"chat_type"` // "support" or "contract"
	Timestamp       time.Time `bson:"timestamp" json:"timestamp"`
}
