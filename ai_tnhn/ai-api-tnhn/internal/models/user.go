package models

import (
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/utils/hash"
)

type User struct {
	model.BaseModel `bson:",inline"`
	Name            string        `bson:"name" json:"name"`
	OrgID           string        `bson:"org_id" json:"org_id"`
	Email           string        `bson:"email" json:"email"`
	Username        string        `bson:"username" json:"username"`
	Password        hash.Password `bson:"password" json:"password"`
	Role            string        `bson:"role" json:"role"`
	IsEmployee      bool          `bson:"-" json:"is_employee"`
	IsCompany       bool          `bson:"-" json:"is_company"`
	Active          bool          `bson:"active" json:"active"`

	// RBAC for Employee
	AssignedInundationPointIDs       []string `bson:"assigned_inundation_point_ids" json:"assigned_inundation_point_ids"`
	AssignedRainStationIDs           []string `bson:"assigned_rain_station_ids" json:"assigned_rain_station_ids"`
	AssignedLakeStationIDs           []string `bson:"assigned_lake_station_ids" json:"assigned_lake_station_ids"`
	AssignedRiverStationIDs          []string `bson:"assigned_river_station_ids" json:"assigned_river_station_ids"`
	AssignedEmergencyConstructionIDs []string `bson:"assigned_emergency_construction_ids" json:"assigned_emergency_construction_ids"`
	AssignedPumpingStationID         string   `bson:"assigned_pumping_station_id" json:"assigned_pumping_station_id"`
}
