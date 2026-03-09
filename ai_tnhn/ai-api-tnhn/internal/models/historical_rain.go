package models

import "ai-api-tnhn/internal/base/model"

type HistoricalRainRecord struct {
	model.BaseModel `bson:",inline"`
	Station         string  `json:"station" bson:"station"`
	Date            string  `json:"date" bson:"date"`
	Rainfall        float64 `json:"rainfall" bson:"rainfall"`
}

type MonthlyTotal struct {
	Station string  `bson:"_id_station" json:"station"`
	Year    int     `bson:"_id_year" json:"year"`
	Month   int     `bson:"_id_month" json:"month"`
	Total   float64 `bson:"total" json:"total"`
}
