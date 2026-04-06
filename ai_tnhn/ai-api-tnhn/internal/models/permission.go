package models

import (
	"ai-api-tnhn/internal/base/model"
)

type Permission struct {
	model.BaseModel `bson:",inline"`
	Code            string `bson:"code" json:"code"`
	Title           string `bson:"title" json:"title"`
	Group           string `bson:"group" json:"group"`
	Type            string `bson:"type" json:"type"`
	Description     string `bson:"description" json:"description"`
}

type RolePermission struct {
	model.BaseModel `bson:",inline"`
	Role            string   `bson:"role" json:"role"`
	Permissions     []string `bson:"permissions" json:"permissions"`
}
