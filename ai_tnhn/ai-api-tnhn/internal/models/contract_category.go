package models

import (
	"ai-api-tnhn/internal/base/model"
)

type ContractCategory struct {
	model.BaseModel `bson:",inline"`
	Name            string `bson:"name" json:"name"`
	Code            string `bson:"code" json:"code"`           // Unique identifier
	Description     string `bson:"description" json:"description"`
	ParentID        string `bson:"parent_id" json:"parent_id"` // Empty string if it's a root category
	Path            string `bson:"path" json:"path"`           // Materialized Path, e.g., ",id1,id2,"
	Level           int    `bson:"level" json:"level"`         // 0 for root
	Status          bool   `bson:"status" json:"status"`
	Order           int    `bson:"order" json:"order"`
	DriveFolderID   string `bson:"drive_folder_id" json:"drive_folder_id"`
}
