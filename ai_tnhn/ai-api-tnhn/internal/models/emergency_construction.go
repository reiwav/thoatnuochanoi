package models

import (
	"ai-api-tnhn/internal/base/model"
)

type EmergencyConstruction struct {
	model.BaseModel `bson:",inline"`
	Name            string `bson:"name" json:"name"`
	Description     string `bson:"description" json:"description"`
	Status          string `bson:"status" json:"status"` // Đang thực hiện, hoàn thành
	OrgID           string `bson:"org_id" json:"org_id"` // Công ty nào
}
