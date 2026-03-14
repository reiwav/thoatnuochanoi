package models

import (
	"ai-api-tnhn/internal/base/model"
)

type EmergencyConstruction struct {
	model.BaseModel `bson:",inline"`
	Name            string `bson:"name" json:"name"`
	Description     string `bson:"description" json:"description"`
	Location        string `bson:"location" json:"location"`
	StartDate       int64  `bson:"start_date" json:"start_date"`
	EndDate         int64  `bson:"end_date" json:"end_date"`
	Status          string `bson:"status" json:"status"` // planned, ongoing, completed, suspended
	Cost            int64  `bson:"cost" json:"cost"`
	OrgID           string `bson:"org_id" json:"org_id"`
	OrganizationName string `bson:"-" json:"organization_name,omitempty"`
}
