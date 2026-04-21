package models

import (
	"ai-api-tnhn/internal/base/model"
)

type EmergencyConstruction struct {
	model.BaseModel  `bson:",inline"`
	Name             string `bson:"name" json:"name" example:"Sửa chữa cống xả A"`
	Description      string `bson:"description" json:"description" example:"Khắc phục sự cố sụt lún cống"`
	Location         string `bson:"location" json:"location" example:"Số 1 Đào Duy Anh"`
	StartDate        int64  `bson:"start_date" json:"start_date" example:"1672531200"`
	EndDate          int64  `bson:"end_date" json:"end_date" example:"1675123200"`
	Status           string `bson:"status" json:"status" example:"ongoing"` // planned, ongoing, completed, suspended
	Cost             int64  `bson:"cost" json:"cost" example:"150000000"`
	OrgID            string   `bson:"org_id" json:"org_id" example:"60f123456789"`
	SharedOrgIDs     []string `bson:"shared_org_ids" json:"shared_org_ids" example:"[\"60f987654321\"]"`
	OrganizationName string `bson:"-" json:"organization_name,omitempty"`
}
