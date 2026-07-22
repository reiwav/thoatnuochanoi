package models

import (
	"ai-api-tnhn/internal/base/model"
	"time"
)

type RainRecord struct {
	model.BaseModel `bson:",inline"`
	StationID       int64     `bson:"station_id" json:"station_id"`
	StationName     string    `bson:"station_name" json:"station_name"`
	Date            string    `bson:"date" json:"date"`
	Timestamp       time.Time `bson:"timestamp" json:"timestamp"`
	Value           float64   `bson:"value" json:"value"`
}

type LakeRecord struct {
	model.BaseModel `bson:",inline"`
	StationID       int64     `bson:"station_id" json:"station_id"`
	StationName     string    `bson:"station_name" json:"station_name"`
	Date            string    `bson:"date" json:"date"`
	Timestamp       time.Time `bson:"timestamp" json:"timestamp"`
	Value           float64   `bson:"value" json:"value"`
	Source          string    `bson:"source" json:"source" example:"manual"`                 // "auto" | "manual"
	ThresholdStatus string    `bson:"threshold_status" json:"threshold_status" example:"high"` // "normal" | "high" | "low"
	MinThreshold    float64   `bson:"min_threshold" json:"min_threshold" example:"1.5"`       // Ngưỡng thấp tại mốc ghi
	MaxThreshold    float64   `bson:"max_threshold" json:"max_threshold" example:"3.5"`       // Ngưỡng cao tại mốc ghi
}

type RiverRecord struct {
	model.BaseModel `bson:",inline"`
	StationID       int64     `bson:"station_id" json:"station_id"`
	StationName     string    `bson:"station_name" json:"station_name"`
	Date            string    `bson:"date" json:"date"`
	Timestamp       time.Time `bson:"timestamp" json:"timestamp"`
	Value           float64   `bson:"value" json:"value"`
	Source          string    `bson:"source" json:"source" example:"manual"`                 // "auto" | "manual"
	ThresholdStatus string    `bson:"threshold_status" json:"threshold_status" example:"high"` // "normal" | "high" | "low"
	MinThreshold    float64   `bson:"min_threshold" json:"min_threshold" example:"1.5"`       // Ngưỡng thấp tại mốc ghi
	MaxThreshold    float64   `bson:"max_threshold" json:"max_threshold" example:"3.5"`       // Ngưỡng cao tại mốc ghi
}
