package models

import (
	"ai-api-tnhn/internal/base/model"
)

type InundationUpdate struct {
	model.BaseModel `bson:",inline"`
	ReportID        string        `bson:"report_id" json:"report_id" example:"60f123456789"`
	UserID          string        `bson:"user_id" json:"user_id" example:"60a123456789"`
	UserEmail       string        `bson:"user_email" json:"user_email" example:"emp@hsdc.com.vn"`
	UserName        string        `bson:"user_name" json:"user_name" example:"Nguyễn Văn B"`
	Timestamp       int64         `bson:"timestamp" json:"timestamp" example:"1682056800"`
	Description     string        `bson:"description" json:"description" example:"Nước đang rút chậm"`
	Depth           string        `bson:"depth" json:"depth" example:"15cm"`
	Length          string        `bson:"length" json:"length" example:"10m"`
	Width           string        `bson:"width" json:"width" example:"5m"`
	TrafficStatus   string        `bson:"traffic_status" json:"traffic_status" example:"Chậm"`
	Images          []string      `bson:"images,omitempty" json:"images,omitempty" example:"[\"img3.jpg\"]"` // Google Drive File IDs
	ReviewComment   string        `bson:"review_comment,omitempty" json:"review_comment,omitempty" example:"Số liệu khớp"`
	ReviewerId      string        `bson:"reviewer_id,omitempty" json:"reviewer_id,omitempty" example:"60a111111111"`
	ReviewerEmail   string        `bson:"reviewer_email,omitempty" json:"reviewer_email,omitempty" example:"admin@hsdc.com.vn"`
	ReviewerName    string        `bson:"reviewer_name,omitempty" json:"reviewer_name,omitempty" example:"Admin"`
	NeedsCorrection bool          `bson:"needs_correction" json:"needs_correction" example:"false"`
	IsReviewUpdated bool          `bson:"is_review_updated" json:"is_review_updated" example:"true"`
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
	OrgID                   string             `bson:"org_id" json:"org_id" example:"60f123456789"`
	SharedOrgIDs            []string           `bson:"shared_org_ids" json:"shared_org_ids" example:"[\"60f987654321\"]"`
	ShareAll                bool               `bson:"share_all" json:"share_all" example:"false"`
	PointID                 string             `bson:"point_id" json:"point_id" example:"60f222222222"` // Link to InundationStation (optional if new location)
	UserID                  string             `bson:"user_id" json:"user_id" example:"60a123456789"`
	UserEmail               string             `bson:"user_email" json:"user_email" example:"emp@hsdc.com.vn"`
	StreetName              string             `bson:"street_name" json:"street_name" example:"Phố Huế"`
	Depth                   string             `bson:"depth" json:"depth" example:"20cm"`
	Length                  string             `bson:"length" json:"length" example:"20m"`
	Width                   string             `bson:"width" json:"width" example:"10m"`
	StartTime               int64              `bson:"start_time" json:"start_time" example:"1682055000"`
	EndTime                 int64              `bson:"end_time" json:"end_time" example:"0"`
	Description             string             `bson:"description" json:"description" example:"Ngập cục bộ tại ngã tư"`
	Images                  []string           `bson:"images" json:"images" example:"[\"img1.jpg\", \"img2.jpg\"]"` // Initial images
	Updates                 []InundationUpdate `bson:"-" json:"updates"`
	Status                  string             `bson:"status" json:"status" example:"active"` // active, resolved
	TrafficStatus           string             `bson:"traffic_status" json:"traffic_status" example:"Tắc nghẽn"`
	ReviewComment           string             `bson:"review_comment,omitempty" json:"review_comment,omitempty" example:"Đang theo dõi"`
	ReviewerId              string             `bson:"reviewer_id,omitempty" json:"reviewer_id,omitempty" example:"60a111111111"`
	ReviewerEmail           string             `bson:"reviewer_email,omitempty" json:"reviewer_email,omitempty" example:"admin@hsdc.com.vn"`
	ReviewerName            string             `bson:"reviewer_name,omitempty" json:"reviewer_name,omitempty" example:"Admin"`
	NeedsCorrection         bool               `bson:"needs_correction" json:"needs_correction" example:"false"`
	NeedsCorrectionUpdateID string             `bson:"needs_correction_update_id" json:"needs_correction_update_id" example:""`
	IsReviewUpdated         bool               `bson:"is_review_updated" json:"is_review_updated" example:"false"`
	Address                 string             `bson:"-" json:"address"`
	OrgName                 string             `bson:"-" json:"org_name"`
	OrgCode                 string             `bson:"-" json:"org_code"`

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

	LastReportID string `bson:"last_report_id" json:"last_report_id"`
}
