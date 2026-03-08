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
}

type RiverRecord struct {
	model.BaseModel `bson:",inline"`
	StationID       int64     `bson:"station_id" json:"station_id"`
	StationName     string    `bson:"station_name" json:"station_name"`
	Date            string    `bson:"date" json:"date"`
	Timestamp       time.Time `bson:"timestamp" json:"timestamp"`
	Value           float64   `bson:"value" json:"value"`
}
