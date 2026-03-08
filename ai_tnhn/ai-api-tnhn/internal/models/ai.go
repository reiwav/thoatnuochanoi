package models

import (
	"ai-api-tnhn/internal/base/model"
	"time"
)

type AiUsage struct {
	model.BaseModel `bson:",inline"`
	ModelName       string    `bson:"model_name" json:"model_name"`
	PromptTokens    int       `bson:"prompt_tokens" json:"prompt_tokens"`
	CandidateTokens int       `bson:"candidate_tokens" json:"candidate_tokens"`
	TotalTokens     int       `bson:"total_tokens" json:"total_tokens"`
	Timestamp       time.Time `bson:"timestamp" json:"timestamp"`
}
