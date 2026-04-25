package models

import "ai-api-tnhn/internal/base/model"

type WastewaterStation struct {
	model.BaseModel `bson:",inline"`
	Name            string                   `json:"name" bson:"name" example:"Trạm xử lý nước thải Bảy Mẫu"`
	Address         string                   `json:"address" bson:"address" example:"Công viên Thống Nhất, Hà Nội"`
	Active          bool                     `json:"active" bson:"active" example:"true"`
	OrgID           string                   `json:"org_id" bson:"org_id" example:"60f123456789"`
	SharedOrgIDs    []string                 `json:"shared_org_ids" bson:"shared_org_ids" example:"[\"60f987654321\"]"`
	ShareAll        bool                     `json:"share_all" bson:"share_all" example:"false"`
	Priority        int                      `json:"priority" bson:"priority" example:"1"`
	LastReport      *WastewaterStationReport `json:"last_report" bson:"last_report"`
}

type WastewaterStationReport struct {
	model.BaseModel `bson:",inline"`
	StationID       string `json:"station_id" bson:"station_id" example:"60f123456789"`
	UserID          string `json:"user_id" bson:"user_id" example:"60a123456789"`
	UserName        string `json:"user_name" bson:"user_name" example:"Nguyễn Văn A"`
	Note            string `json:"note" bson:"note" example:"Vận hành ổn định, nước đầu ra trong"`
	Timestamp       int64  `json:"timestamp" bson:"timestamp" example:"1625097600"`
}
