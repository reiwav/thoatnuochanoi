package models

import (
	"ai-api-tnhn/internal/base/model"
)

type InundationUpdate struct {
	model.BaseModel `bson:",inline"`
	ReportID        string        `bson:"report_id" json:"report_id"`
	UserID          string        `bson:"user_id" json:"user_id"`
	UserEmail       string        `bson:"user_email" json:"user_email"`
	UserName        string        `bson:"user_name" json:"user_name"`
	Timestamp       int64         `bson:"timestamp" json:"timestamp"`
	Description     string        `bson:"description" json:"description"`
	Depth           string        `bson:"depth" json:"depth"`
	Length          string        `bson:"length" json:"length"`
	Width           string        `bson:"width" json:"width"`
	TrafficStatus   string        `bson:"traffic_status" json:"traffic_status"`
	Images          []string      `bson:"images,omitempty" json:"images,omitempty"` // Google Drive File IDs
	ReviewComment   string        `bson:"review_comment,omitempty" json:"review_comment,omitempty"`
	ReviewerId      string        `bson:"reviewer_id,omitempty" json:"reviewer_id,omitempty"`
	ReviewerEmail   string        `bson:"reviewer_email,omitempty" json:"reviewer_email,omitempty"`
	ReviewerName    string        `bson:"reviewer_name,omitempty" json:"reviewer_name,omitempty"`
	NeedsCorrection bool          `bson:"needs_correction" json:"needs_correction"`
	OldData         []interface{} `bson:"old_data,omitempty" json:"old_data,omitempty"`
	// Technical sync fields
	SurveyChecked bool     `bson:"survey_checked" json:"survey_checked"`
	SurveyImages  []string `bson:"survey_images" json:"survey_images"`
	SurveyNote    string   `bson:"survey_note" json:"survey_note"`
	SurveyUserID  string   `bson:"survey_user_id" json:"survey_user_id"`
	MechChecked   bool     `bson:"mech_checked" json:"mech_checked"`
	MechImages    []string `bson:"mech_images" json:"mech_images"`
	MechNote      string   `bson:"mech_note" json:"mech_note"`
	MechD         string   `bson:"mech_d" json:"mech_d"`
	MechR         string   `bson:"mech_r" json:"mech_r"`
	MechS         string   `bson:"mech_s" json:"mech_s"`
	MechUserID    string   `bson:"mech_user_id" json:"mech_user_id"`
}

type InundationReport struct {
	model.BaseModel         `bson:",inline"`
	OrgID                   string             `bson:"org_id" json:"org_id"`
	SharedOrgIDs            []string           `bson:"shared_org_ids" json:"shared_org_ids"`
	PointID                 string             `bson:"point_id" json:"point_id"` // Link to InundationStation (optional if new location)
	UserID                  string             `bson:"user_id" json:"user_id"`
	UserEmail               string             `bson:"user_email" json:"user_email"`
	StreetName              string             `bson:"street_name" json:"street_name"`
	Depth                   string             `bson:"depth" json:"depth"`
	Length                  string             `bson:"length" json:"length"`
	Width                   string             `bson:"width" json:"width"`
	StartTime               int64              `bson:"start_time" json:"start_time"`
	EndTime                 int64              `bson:"end_time" json:"end_time"`
	Description             string             `bson:"description" json:"description"`
	Images                  []string           `bson:"images" json:"images"` // Initial images
	Updates                 []InundationUpdate `bson:"-" json:"updates"`
	Status                  string             `bson:"status" json:"status"` // active, resolved
	TrafficStatus           string             `bson:"traffic_status" json:"traffic_status"`
	ReviewComment           string             `bson:"review_comment,omitempty" json:"review_comment,omitempty"`
	ReviewerId              string             `bson:"reviewer_id,omitempty" json:"reviewer_id,omitempty"`
	ReviewerEmail           string             `bson:"reviewer_email,omitempty" json:"reviewer_email,omitempty"`
	ReviewerName            string             `bson:"reviewer_name,omitempty" json:"reviewer_name,omitempty"`
	NeedsCorrection         bool               `bson:"needs_correction" json:"needs_correction"`
	NeedsCorrectionUpdateID string             `bson:"needs_correction_update_id" json:"needs_correction_update_id"`

	// Design Survey Data
	SurveyChecked bool     `bson:"survey_checked" json:"survey_checked"`
	SurveyImages  []string `bson:"survey_images" json:"survey_images"`
	SurveyNote    string   `bson:"survey_note" json:"survey_note"`
	SurveyUserID  string   `bson:"survey_user_id" json:"survey_user_id"`

	// Mechanization Data
	MechChecked bool     `bson:"mech_checked" json:"mech_checked"`
	MechImages  []string `bson:"mech_images" json:"mech_images"`
	MechNote    string   `bson:"mech_note" json:"mech_note"`
	MechD       string   `bson:"mech_d" json:"mech_d"`
	MechR       string   `bson:"mech_r" json:"mech_r"`
	MechS       string   `bson:"mech_s" json:"mech_s"`
	MechUserID  string   `bson:"mech_user_id" json:"mech_user_id"`
}
