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
	Depth           float64       `bson:"depth" json:"depth" example:"15"`
	Length          string        `bson:"length" json:"length" example:"10"`
	Width           string        `bson:"width" json:"width" example:"5"`
	TrafficStatus   string        `bson:"traffic_status" json:"traffic_status" example:"Chậm"`
	FloodLevelName  string        `bson:"flood_level_name" json:"flood_level_name" example:"Ngập nhẹ"`
	FloodLevelColor string        `bson:"flood_level_color" json:"flood_level_color" example:"#FFD600"`
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
	MechD         float64  `bson:"mech_d" json:"mech_d"`
	MechR         string   `bson:"mech_r" json:"mech_r"`
	MechS         string   `bson:"mech_s" json:"mech_s"`
	MechUserID    string   `bson:"mech_user_id" json:"mech_user_id"`
}

type InundationReport struct {
	model.BaseModel `bson:",inline"`
	OrgID           string   `bson:"org_id" json:"org_id" example:"60f123456789"`
	SharedOrgIDs    []string `bson:"shared_org_ids" json:"shared_org_ids" example:"[\"60f987654321\"]"`
	ShareAll        bool     `bson:"share_all" json:"share_all" example:"false"`

	Status  string `bson:"status" json:"status" example:"active"` // active, resolved
	EndTime int64  `bson:"end_time" json:"end_time" example:"0"`

	ReportReviewBase `bson:",inline"`
	// Design Survey Data
	ReportSurveyBase `bson:",inline"`

	// Mechanization Data
	ReportMechBase       `bson:",inline"`
	InundationReportBase `bson:",inline"`

	LastReportID string `bson:"last_report_id" json:"last_report_id"`

	Updates []InundationUpdate `bson:"-" json:"updates"`
	Address string             `bson:"-" json:"address"`
	OrgName string             `bson:"-" json:"org_name"`
	OrgCode string             `bson:"-" json:"org_code"`
}

type InundationReportBase struct {
	PointID         string   `form:"point_id" json:"point_id" binding:"required" example:"point_123"`
	StreetName      string   `form:"street_name" json:"street_name" example:"Phố Huế"`
	Depth           float64  `form:"depth" json:"depth" example:"20-30cm"`
	Length          string   `form:"length" json:"length" example:"100m"`
	Width           string   `form:"width" json:"width" example:"50m"`
	Description     string   `form:"description" json:"description" example:"Ngập nhẹ"`
	TrafficStatus   string   `form:"traffic_status" json:"traffic_status" example:"DI_CHUYEN_CHAM"`
	FloodLevelName  string   `bson:"flood_level_name" json:"flood_level_name" example:"Ngập nhẹ"`
	FloodLevelColor string   `bson:"flood_level_color" json:"flood_level_color" example:"#FFD600"`
	StartTime       int64    `form:"start_time" json:"start_time" example:"1620000000"`
	UserID          string   `bson:"user_id" json:"user_id" example:"60a123456789"`
	UserEmail       string   `bson:"user_email" json:"user_email" example:"emp@hsdc.com.vn"`
	Images          []string `bson:"images" json:"images" example:"[\"img1.jpg\", \"img2.jpg\"]"` // Initial images

}

type ReportReviewBase struct {
	ReviewComment           string `form:"review_comment" json:"review_comment" example:"Đã xử lý"`
	ReviewerId              string `form:"reviewer_id" json:"reviewer_id" example:"user_123"`
	ReviewerName            string `form:"reviewer_name" json:"reviewer_name" example:"Admin"`
	ReviewerEmail           string `form:"reviewer_email" json:"reviewer_email" example:"[EMAIL_ADDRESS]"`
	NeedsCorrection         bool   `form:"needs_correction" json:"needs_correction" example:"true"`
	IsReviewUpdated         bool   `form:"is_review_updated" json:"is_review_updated" example:"true"`
	NeedsCorrectionUpdateID string `form:"needs_correction_update_id" json:"needs_correction_update_id" example:"update_123"`
}

type ReportMechBase struct {
	MechD       float64  `form:"mech_d" json:"mech_d" example:"D1"`
	MechR       string   `form:"mech_r" json:"mech_r" example:"R1"`
	MechS       string   `form:"mech_s" json:"mech_s" example:"S1"`
	MechChecked bool     `form:"mech_checked" json:"mech_checked" example:"true"`
	MechNote    string   `form:"mech_note" json:"mech_note" example:"Máy xúc đã đến"`
	MechUserID  string   `bson:"mech_user_id" json:"mech_user_id"`
	MechImages  []string `bson:"mech_images" json:"mech_images"`
}

type ReportSurveyBase struct {
	SurveyChecked bool     `form:"survey_checked" json:"survey_checked" example:"true"`
	SurveyNote    string   `form:"survey_note" json:"survey_note" example:"Đã khảo sát"`
	SurveyUserID  string   `bson:"survey_user_id" json:"survey_user_id"`
	SurveyImages  []string `bson:"survey_images" json:"survey_images"`
}
