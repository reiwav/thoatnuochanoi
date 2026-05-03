package models

import (
	"ai-api-tnhn/internal/base/model"
	"time"
)

type AppSetting struct {
	model.BaseModel `bson:",inline"`
	Code            string       `json:"code" bson:"code"` // FloodLevel, etc.
	FloodLevels     []FloodLevel `json:"flood_levels,omitempty" bson:"flood_levels,omitempty"`
	RainSetting     *RainSetting `json:"rain_setting,omitempty" bson:"rain_setting,omitempty"`
}

type RainSetting struct {
	SessionID string `json:"session_id" bson:"session_id"`
}

type FloodLevel struct {
	Code        string    `json:"code" bson:"code" example:"flood_level_1"`
	Name        string    `json:"name" bson:"name" example:"Bình thường"`
	MinDepth    float64   `json:"min_depth" bson:"min_depth" example:"0"`
	MaxDepth    float64   `json:"max_depth" bson:"max_depth" example:"0.1"`
	Color       string    `json:"color" bson:"color" example:"#00FF00"`
	Description string    `json:"description" bson:"description" example:"Chưa ngập"`
	User        string    `json:"user" bson:"user" example:"Admin"`
	Ctime       time.Time `json:"ctime" bson:"ctime"`
	IsFlooding  bool      `json:"is_flooding" bson:"is_flooding"` // Trạng thái ngập
}
