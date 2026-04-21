package models

import (
	"ai-api-tnhn/internal/base/model"
)

type ContractCategory struct {
	model.BaseModel `bson:",inline"`
	Name            string `bson:"name" json:"name" example:"Hợp đồng Duy trì"`
	Code            string `bson:"code" json:"code" example:"CAT_DUYTRI"`           // Unique identifier
	Description     string `bson:"description" json:"description" example:"Các hợp đồng về duy trì hệ thống"`
	ParentID        string `bson:"parent_id" json:"parent_id" example:""` // Empty string if it's a root category
	Path            string `bson:"path" json:"path" example:",id1,id2,"`           // Materialized Path, e.g., ",id1,id2,"
	Level           int    `bson:"level" json:"level" example:"0"`         // 0 for root
	Status          bool   `bson:"status" json:"status" example:"true"`
	Order           int    `bson:"order" json:"order" example:"1"`
	DriveFolderID   string `bson:"drive_folder_id" json:"drive_folder_id" example:"1abc2def3ghi"`
}
