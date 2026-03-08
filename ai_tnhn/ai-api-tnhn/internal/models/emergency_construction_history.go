package models

import (
	"ai-api-tnhn/internal/base/model"
)

type EmergencyConstructionHistory struct {
	model.BaseModel `bson:",inline"`
	ConstructionID  string `bson:"construction_id" json:"construction_id"`
	Action          string `bson:"action" json:"action"` // create, update_status, update_info, delete
	OldStatus       string `bson:"old_status" json:"old_status"`
	NewStatus       string `bson:"new_status" json:"new_status"`
	Note            string `bson:"note" json:"note"`
	UpdatedBy       string `bson:"updated_by" json:"updated_by"` // User ID or Name
}
