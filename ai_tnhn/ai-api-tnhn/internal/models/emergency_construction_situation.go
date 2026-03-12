package models

import (
	"ai-api-tnhn/internal/base/model"
)

type EmergencyConstructionSituation struct {
	model.BaseModel `bson:",inline"`
	ConstructionID  string   `bson:"construction_id" json:"construction_id"`
	Command         string   `bson:"command" json:"command"` // Lệnh 1 -> Lệnh 100
	Location        string   `bson:"location" json:"location"`
	Conclusion      string   `bson:"conclusion" json:"conclusion"`
	Impact          string   `bson:"impact" json:"impact"`
	Proposal        string   `bson:"proposal" json:"proposal"`
	Images          []string `bson:"images" json:"images"`
	ReportedBy      string   `bson:"reported_by" json:"reported_by"`
	ReportDate      int64    `bson:"report_date" json:"report_date"`
}
