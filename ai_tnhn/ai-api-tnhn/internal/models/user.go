package models

import (
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/utils/hash"
)

type User struct {
	model.BaseModel `bson:",inline"`
	Name            string        `bson:"name" json:"name" example:"Nguyễn Văn A"`
	OrgID           string        `bson:"org_id" json:"org_id" example:"60f123456789"`
	Email           string        `bson:"email" json:"email" example:"admin@hsdc.com.vn"`
	Username        string        `bson:"username" json:"username" example:"admin"`
	Password        hash.Password `bson:"password" json:"password" example:"********"`
	Role            string        `bson:"role" json:"role" example:"admin"`
	IsEmployee      bool          `bson:"-" json:"is_employee" example:"false"`
	IsCompany       bool          `bson:"-" json:"is_company" example:"true"`
	Active          bool          `bson:"active" json:"active" example:"true"`

	// RBAC for Employee
	AssignedInundationStationIDs     []string `bson:"assigned_inundation_station_ids" json:"assigned_inundation_station_ids"`
	AssignedRainStationIDs           []string `bson:"assigned_rain_station_ids" json:"assigned_rain_station_ids"`
	AssignedLakeStationIDs           []string `bson:"assigned_lake_station_ids" json:"assigned_lake_station_ids"`
	AssignedRiverStationIDs          []string `bson:"assigned_river_station_ids" json:"assigned_river_station_ids"`
	AssignedEmergencyConstructionIDs []string `bson:"assigned_emergency_construction_ids" json:"assigned_emergency_construction_ids"`
	AssignedPumpingStationID         string   `bson:"assigned_pumping_station_id" json:"assigned_pumping_station_id"`
}
