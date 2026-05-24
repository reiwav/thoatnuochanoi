package dto

import "ai-api-tnhn/internal/models"

// CreateReportRequest defines the inputs for creating a new inundation report
type CreateReportRequest struct {
	PointID string `form:"point_id" json:"point_id" binding:"required" example:"point_123"`
	//StreetName string `form:"street_name" json:"street_name" example:"Phố Huế"`
	models.ReportEnterpriseBase
}

// UpdateReportRequest defines the inputs for updating an existing report
type UpdateReportRequest struct {
	Depth         string `form:"depth" json:"depth" example:"30-40cm"`
	Length        string `form:"length" json:"length" example:"150m"`
	Width         string `form:"width" json:"width" example:"60m"`
	Description   string `form:"description" json:"description" example:"Ngập tăng"`
	TrafficStatus string `form:"traffic_status" json:"traffic_status" example:"UN_TAC"`
}

// AddUpdateSitutionRequest defines the inputs for adding a situational update to an active report
type AddUpdateSitutionRequest struct {
	models.ReportEnterpriseBase
	Resolve bool `form:"resolve" json:"resolve" example:"false"`
}

// ReviewRequest defines the inputs for adding a review comment
type ReviewRequest struct {
	Comment string `json:"comment" binding:"required" example:"Duyệt báo cáo"`
}

// CreatePointRequest for creating/updating inundation points
type CreatePointRequest struct {
	Name         string   `json:"name" binding:"required" example:"Điểm ngập Phố Huế"`
	Address      string   `json:"address" example:"79 Phố Huế"`
	Lat          float64  `json:"lat" example:"21.0285"`
	Lng          float64  `json:"lng" example:"105.8542"`
	OrgID        string   `json:"org_id" binding:"required" example:"org_hanoi"`
	SharedOrgIDs []string `json:"shared_org_ids" example:"org_1,org_2"`
	ShareAll     bool     `json:"share_all" example:"false"`
}
