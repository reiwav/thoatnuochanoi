package models

import "ai-api-tnhn/internal/base/model"

type PumpingStation struct {
	model.BaseModel `bson:",inline"`
	Name            string                 `json:"name" bson:"name" example:"Trạm bơm Yên Sở"`
	Address         string                 `json:"address" bson:"address" example:"Yên Sở, Hoàng Mai, Hà Nội"`
	PumpCount       int                    `json:"pump_count" bson:"pump_count" example:"20"`
	Active          bool                   `json:"active" bson:"active" example:"true"`
	Link            string                 `json:"link" bson:"link" example:"https://example.com/yenso"`
	IsAuto          bool                   `json:"is_auto" bson:"is_auto" example:"true"`
	OrgID           string                 `json:"org_id" bson:"org_id" example:"60f123456789"`
	SharedOrgIDs    []string               `json:"shared_org_ids" bson:"shared_org_ids" example:"[\"60f987654321\"]"`
	ShareAll        bool                   `json:"share_all" bson:"share_all" example:"false"`
	Priority        int                    `json:"priority" bson:"priority" example:"1"`
	LastReport      *PumpingStationHistory `json:"last_report" bson:"last_report"`
}

type PumpingStationHistory struct {
	model.BaseModel  `bson:",inline"`
	StationID        string `json:"station_id" bson:"station_id" example:"60f123456789"`
	UserID           string `json:"user_id" bson:"user_id" example:"60a123456789"`
	UserName         string `json:"user_name" bson:"user_name" example:"Nguyễn Văn A"`
	OperatingCount   int    `json:"operating_count" bson:"operating_count" example:"15"`
	ClosedCount      int    `json:"closed_count" bson:"closed_count" example:"3"`
	MaintenanceCount int    `json:"maintenance_count" bson:"maintenance_count" example:"2"`
	NoSignalCount    int    `json:"no_signal_count" bson:"no_signal_count" example:"0"`
	Note             string `json:"note" bson:"note" example:"Vận hành bình thường"`
	Timestamp        int64  `json:"timestamp" bson:"timestamp" example:"1625097600"`
}
