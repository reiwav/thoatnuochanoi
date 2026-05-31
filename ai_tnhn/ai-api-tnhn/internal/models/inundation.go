package models

import (
	"ai-api-tnhn/internal/base/model"
)

type InundationHistory struct {
	model.BaseModel `bson:",inline"`
	ReportId        string   `bson:"report_id" json:"report_id"`
	InundationId    string   `bson:"inundation_id" json:"inundation_id"`
	UserId          string   `bson:"user_id" json:"user_id"`
	UserName        string   `bson:"user_name" json:"user_name"`
	UserEmail       string   `bson:"user_email" json:"user_email"`
	OrgId           string   `bson:"org_id" json:"org_id"`
	OrgName         string   `bson:"org_name" json:"org_name"`
	RolePermission  string   `bson:"role_permission" json:"role_permission"` // inundation:enterprise_report, inundation:review, inundation:survey, inundation:mechanic
	Depth           float64  `bson:"depth" json:"depth"`
	Width           string   `bson:"width" json:"width"`
	Length          string   `bson:"length" json:"length"`
	TrafficStatus   string   `bson:"traffic_status" json:"traffic_status"`
	FloodLevelName  string   `bson:"flood_level_name" json:"flood_level_name"`
	FloodLevelColor string   `bson:"flood_level_color" json:"flood_level_color"`
	Images          []string `bson:"images" json:"images"`
	Note            string   `bson:"note" json:"note"`
	ReviewComment   string   `bson:"review_comment" json:"review_comment"`
	NeedsCorrection bool     `bson:"needs_correction" json:"needs_correction"`
}

type InundationReport struct {
	model.BaseModel `bson:",inline"`
	OrgID           string `bson:"org_id" json:"org_id" example:"60f123456789"`
	// SharedOrgIDs    []string `bson:"shared_org_ids" json:"shared_org_ids" example:"[\"60f987654321\"]"`
	// ShareAll        bool     `bson:"share_all" json:"share_all" example:"false"`

	Status     string `bson:"status" json:"status" example:"active"` // active, resolved
	EndTime    int64  `bson:"end_time" json:"end_time" example:"0"`
	HasFlooded bool   `bson:"has_flooded" json:"has_flooded"`

	PointID    string `bson:"point_id" form:"point_id" json:"point_id" example:"point_123"`
	StreetName string `bson:"street_name" form:"street_name" json:"street_name" example:"Phố Huế"`

	ReviewHistoryID     string `bson:"review_history_id" json:"review_history_id"`
	SurveyHistoryID     string `bson:"survey_history_id" json:"survey_history_id"`
	MechHistoryID       string `bson:"mech_history_id" json:"mech_history_id"`
	EnterpriseHistoryID string `bson:"enterprise_history_id" json:"enterprise_history_id"`
	KtclHistoryID       string `bson:"ktcl_history_id" json:"ktcl_history_id"`
	MaxDepth            float64 `bson:"max_depth" json:"max_depth"`
	MaxLength           string  `bson:"max_length" json:"max_length"`
	MaxWidth            string  `bson:"max_width" json:"max_width"`

	ReportReviewBase `bson:"-" json:",inline"`
	// Design Survey Data
	ReportSurveyBase `bson:"-" json:",inline"`

	// Mechanization Data
	ReportMechBase       `bson:"-" json:",inline"`
	ReportEnterpriseBase `bson:"-" json:",inline"`
	ReportKTCLBase       `bson:"-" json:",inline"`

	//Updates []InundationHistory `bson:"-" json:"updates"`
	Address string `bson:"-" json:"address"`
	OrgName string `bson:"-" json:"org_name"`
	OrgCode string `bson:"-" json:"org_code"`
}

type ReportEnterpriseBase struct {
	Depth        float64 `bson:"depth" form:"depth" json:"depth" example:"20"`
	Length       string  `bson:"length" form:"length" json:"length" example:"100m"`
	Width        string  `bson:"width" form:"width" json:"width" example:"50m"`
	Description  string  `bson:"description" form:"description" json:"description" example:"Ngập nhẹ"`
	EntUpdatedAt int64   `bson:"ent_updated_at" json:"ent_updated_at"`
	ReportBase   `bson:",inline"`
}

type ReportBase struct {
	TrafficStatus   string   `bson:"traffic_status" form:"traffic_status" json:"traffic_status" example:"DI_CHUYEN_CHAM"`
	FloodLevelName  string   `bson:"flood_level_name" form:"flood_level_name" json:"flood_level_name" example:"Ngập nhẹ"`
	FloodLevelColor string   `bson:"flood_level_color" form:"flood_level_color" json:"flood_level_color" example:"#FFD600"`
	UserID          string   `bson:"user_id" json:"user_id" example:"60a123456789"`
	UserName        string   `bson:"user_name" json:"user_name" example:"Nguyễn Văn B"`
	UserEmail       string   `bson:"user_email" json:"user_email" example:"emp@hsdc.com.vn"`
	Images          []string `bson:"images" json:"images" example:"[\"img1.jpg\", \"img2.jpg\"]"` // Initial images
	IsFlooding      bool     `bson:"is_flooding" json:"is_flooding"`
}

type ReportReviewBase struct {
	ReviewComment           string `bson:"review_comment,omitempty" form:"review_comment" json:"review_comment" example:"Đã xử lý"`
	ReviewerId              string `bson:"reviewer_id,omitempty" form:"reviewer_id" json:"reviewer_id" example:"user_123"`
	ReviewerName            string `bson:"reviewer_name,omitempty" form:"reviewer_name" json:"reviewer_name" example:"Admin"`
	ReviewerEmail           string `bson:"reviewer_email,omitempty" form:"reviewer_email" json:"reviewer_email" example:"[EMAIL_ADDRESS]"`
	NeedsCorrection         bool   `bson:"needs_correction" form:"needs_correction" json:"needs_correction" example:"true"`
	IsReviewUpdated         bool   `bson:"is_review_updated" form:"is_review_updated" json:"is_review_updated" example:"true"`
	NeedsCorrectionUpdateID string `bson:"needs_correction_update_id" form:"needs_correction_update_id" json:"needs_correction_update_id" example:"update_123"`
	ReviewUpdatedAt         int64  `bson:"review_updated_at" json:"review_updated_at"`
}

type ReportMechBase struct {
	MechD         float64  `bson:"mech_d" form:"mech_d" json:"mech_d" example:"20"`
	MechR         string   `bson:"mech_r" form:"mech_r" json:"mech_r" example:"R1"`
	MechS         string   `bson:"mech_s" form:"mech_s" json:"mech_s" example:"S1"`
	MechChecked   bool     `bson:"mech_checked" form:"mech_checked" json:"mech_checked" example:"true"`
	MechNote      string   `bson:"mech_note" form:"mech_note" json:"mech_note" example:"Máy xúc đã đến"`
	MechUserID    string   `bson:"mech_user_id" json:"mech_user_id"`
	MechUserName  string   `bson:"mech_user_name" json:"mech_user_name"`
	MechUpdatedAt int64    `bson:"mech_updated_at" json:"mech_updated_at"`
	MechImages    []string `bson:"mech_images" json:"mech_images"`
}

type ReportSurveyBase struct {
	SurveyChecked   bool     `bson:"survey_checked" form:"survey_checked" json:"survey_checked" example:"true"`
	SurveyNote      string   `bson:"survey_note" form:"survey_note" json:"survey_note" example:"Đã khảo sát"`
	SurveyUserID    string   `bson:"survey_user_id" json:"survey_user_id"`
	SurveyUserName  string   `bson:"survey_user_name" json:"survey_user_name"`
	SurveyUpdatedAt int64    `bson:"survey_updated_at" json:"survey_updated_at"`
	SurveyImages    []string `bson:"survey_images" json:"survey_images"`
	SurveyD         float64  `bson:"survey_d" form:"survey_d" json:"survey_d"`
	SurveyR         string   `bson:"survey_r" form:"survey_r" json:"survey_r"`
	SurveyS         string   `bson:"survey_s" form:"survey_s" json:"survey_s"`
}

type ReportKTCLBase struct {
	KtclChecked   bool     `bson:"ktcl_checked" form:"ktcl_checked" json:"ktcl_checked" example:"true"`
	KtclNote      string   `bson:"ktcl_note" form:"ktcl_note" json:"ktcl_note" example:"KTCL ghi chú"`
	KtclUserID    string   `bson:"ktcl_user_id" json:"ktcl_user_id"`
	KtclUserName  string   `bson:"ktcl_user_name" json:"ktcl_user_name"`
	KtclUpdatedAt int64    `bson:"ktcl_updated_at" json:"ktcl_updated_at"`
	KtclImages    []string `bson:"ktcl_images" json:"ktcl_images"`
	KtclD         float64  `bson:"ktcl_d" form:"ktcl_d" json:"ktcl_d"`
	KtclR         string   `bson:"ktcl_r" form:"ktcl_r" json:"ktcl_r"`
	KtclS         string   `bson:"ktcl_s" form:"ktcl_s" json:"ktcl_s"`
}
