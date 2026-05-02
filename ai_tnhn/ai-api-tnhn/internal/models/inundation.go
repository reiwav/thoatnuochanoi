package models

import (
	"ai-api-tnhn/internal/base/model"
)

type InundationUpdate struct {
	model.BaseModel `bson:",inline"`
	ReportID        string `bson:"report_id" json:"report_id" example:"60f123456789"`
	Timestamp       int64  `bson:"timestamp" json:"timestamp" example:"1682056800"`

	InundationReportBase `bson:",inline"`
	ReportReviewBase     `bson:",inline"`
	ReportSurveyBase     `bson:",inline"`
	ReportMechBase       `bson:",inline"`

	OldData []interface{} `bson:"old_data,omitempty" json:"old_data,omitempty"`
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
	PointID     string  `bson:"pointid" form:"point_id" json:"point_id" example:"point_123"`
	StreetName  string  `bson:"streetname" form:"street_name" json:"street_name" example:"Phố Huế"`
	Depth       float64 `bson:"depth" form:"depth" json:"depth" example:"20"`
	Length      string  `bson:"length" form:"length" json:"length" example:"100m"`
	Width       string  `bson:"width" form:"width" json:"width" example:"50m"`
	Description string  `bson:"description" form:"description" json:"description" example:"Ngập nhẹ"`
	ReportBase  `bson:",inline"`
}

type ReportBase struct {
	TrafficStatus   string   `bson:"trafficstatus" form:"traffic_status" json:"traffic_status" example:"DI_CHUYEN_CHAM"`
	FloodLevelName  string   `bson:"flood_level_name" form:"flood_level_name" json:"flood_level_name" example:"Ngập nhẹ"`
	FloodLevelColor string   `bson:"flood_level_color" form:"flood_level_color" json:"flood_level_color" example:"#FFD600"`
	UserID          string   `bson:"user_id" json:"user_id" example:"60a123456789"`
	UserName        string   `bson:"user_name" json:"user_name" example:"Nguyễn Văn B"`
	UserEmail       string   `bson:"user_email" json:"user_email" example:"emp@hsdc.com.vn"`
	Images          []string `bson:"images" json:"images" example:"[\"img1.jpg\", \"img2.jpg\"]"` // Initial images
	IsFlooding      bool     `bson:"is_flooding" json:"is_flooding"`
}

type ReportReviewBase struct {
	ReviewComment           string `bson:"reviewcomment,omitempty" form:"review_comment" json:"review_comment" example:"Đã xử lý"`
	ReviewerId              string `bson:"reviewerid,omitempty" form:"reviewer_id" json:"reviewer_id" example:"user_123"`
	ReviewerName            string `bson:"reviewername,omitempty" form:"reviewer_name" json:"reviewer_name" example:"Admin"`
	ReviewerEmail           string `bson:"revieweremail,omitempty" form:"reviewer_email" json:"reviewer_email" example:"[EMAIL_ADDRESS]"`
	NeedsCorrection         bool   `bson:"needscorrection" form:"needs_correction" json:"needs_correction" example:"true"`
	IsReviewUpdated         bool   `bson:"isreviewupdated" form:"is_review_updated" json:"is_review_updated" example:"true"`
	NeedsCorrectionUpdateID string `bson:"needscorrectionupdateid" form:"needs_correction_update_id" json:"needs_correction_update_id" example:"update_123"`
}

type ReportMechBase struct {
	MechD         float64  `bson:"mechd" form:"mech_d" json:"mech_d" example:"20"`
	MechR         string   `bson:"mechr" form:"mech_r" json:"mech_r" example:"R1"`
	MechS         string   `bson:"mechs" form:"mech_s" json:"mech_s" example:"S1"`
	MechChecked   bool     `bson:"mechchecked" form:"mech_checked" json:"mech_checked" example:"true"`
	MechNote      string   `bson:"mechnote" form:"mech_note" json:"mech_note" example:"Máy xúc đã đến"`
	MechUserID    string   `bson:"mech_user_id" json:"mech_user_id"`
	MechUserName  string   `bson:"mech_user_name" json:"mech_user_name"`
	MechUpdatedAt int64    `bson:"mech_updated_at" json:"mech_updated_at"`
	MechImages    []string `bson:"mech_images" json:"mech_images"`
}

type ReportSurveyBase struct {
	SurveyChecked   bool     `bson:"surveychecked" form:"survey_checked" json:"survey_checked" example:"true"`
	SurveyNote      string   `bson:"surveynote" form:"survey_note" json:"survey_note" example:"Đã khảo sát"`
	SurveyUserID    string   `bson:"survey_user_id" json:"survey_user_id"`
	SurveyUserName  string   `bson:"survey_user_name" json:"survey_user_name"`
	SurveyUpdatedAt int64    `bson:"survey_updated_at" json:"survey_updated_at"`
	SurveyImages    []string `bson:"survey_images" json:"survey_images"`
}
