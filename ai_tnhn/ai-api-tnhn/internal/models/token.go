package models

import "ai-api-tnhn/internal/base/model"

type Token struct {
	model.BaseModel `bson:",inline"`
	UserID          string `bson:"user_id" json:"user_id"`
	Name            string `bson:"name" json:"name"`
	OrgID           string `bson:"org_id" json:"org_id"`
	Role            string `bson:"role" json:"role"`
	IsEmployee      bool   `bson:"is_employee" json:"is_employee"`
}
