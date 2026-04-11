package models

import "ai-api-tnhn/internal/base/model"

type PumpingStation struct {
	model.BaseModel `bson:",inline"`
	Name            string   `json:"name" bson:"name"`
	Address         string   `json:"address" bson:"address"`
	PumpCount       int      `json:"pump_count" bson:"pump_count"`
	Active          bool     `json:"active" bson:"active"`
	Link            string   `json:"link" bson:"link"`
	IsAuto          bool     `json:"is_auto" bson:"is_auto"`
	OrgID           string   `json:"org_id" bson:"org_id"`
	SharedOrgIDs    []string `json:"shared_org_ids" bson:"shared_org_ids"`
}

type PumpingStationHistory struct {
	model.BaseModel  `bson:",inline"`
	StationID        string `json:"station_id" bson:"station_id"`
	UserID           string `json:"user_id" bson:"user_id"`
	UserName         string `json:"user_name" bson:"user_name"`
	OperatingCount   int    `json:"operating_count" bson:"operating_count"`
	ClosedCount      int    `json:"closed_count" bson:"closed_count"`
	MaintenanceCount int    `json:"maintenance_count" bson:"maintenance_count"`
	Note             string `json:"note" bson:"note"`
	Timestamp        int64  `json:"timestamp" bson:"timestamp"`
}
