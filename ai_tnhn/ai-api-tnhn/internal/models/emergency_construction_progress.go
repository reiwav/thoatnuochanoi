package models

import (
	"ai-api-tnhn/internal/base/model"
)

type ProgressTask struct {
	Name       string `bson:"name" json:"name"`
	Percentage int    `bson:"percentage" json:"percentage"`
}

type EmergencyConstructionProgress struct {
	model.BaseModel        `bson:",inline"`
	ConstructionID         string         `bson:"construction_id" json:"construction_id"`
	ReportDate             int64          `bson:"report_date" json:"report_date"`
	WorkDone               string         `bson:"work_done" json:"work_done"`
	Tasks                  []ProgressTask `bson:"tasks" json:"tasks"`
	ProgressPercentage     int            `bson:"progress_percentage" json:"progress_percentage"`
	Issues                 string         `bson:"issues" json:"issues"`
	Order                  string         `bson:"order" json:"order"`
	Location               string         `bson:"location" json:"location"`
	Conclusion             string         `bson:"conclusion" json:"conclusion"`
	Influence              string         `bson:"influence" json:"influence"`
	Proposal               string         `bson:"proposal" json:"proposal"`
	Images                 []string       `bson:"images" json:"images"`
	IsCompleted            bool           `bson:"is_completed" json:"is_completed"`
	ExpectedCompletionDate int64          `bson:"expected_completion_date" json:"expected_completion_date"`
	ReportedBy             string         `bson:"reported_by" json:"reported_by"`
	ReporterName           string         `bson:"reporter_name" json:"reporter_name"`
	ReporterEmail          string         `bson:"reporter_email" json:"reporter_email"`
	ReporterOrgName        string         `bson:"reporter_org_name" json:"reporter_org_name"`
	ConstructionName       string         `bson:"-" json:"construction_name"`
}
