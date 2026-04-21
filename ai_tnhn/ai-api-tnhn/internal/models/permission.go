package models

import (
	"ai-api-tnhn/internal/base/model"
)

type Permission struct {
	model.BaseModel `bson:",inline"`
	Code            string `bson:"code" json:"code" example:"PERMISSION_ADMIN"`
	Title           string `bson:"title" json:"title" example:"Quyền quản trị"`
	Group           string `bson:"group" json:"group" example:"Hệ thống"`
	Type            string `bson:"type" json:"type" example:"view"`
	Description     string `bson:"description" json:"description" example:"Cho phép xem tất cả dữ liệu"`
}

type RolePermission struct {
	model.BaseModel `bson:",inline"`
	Role            string   `bson:"role" json:"role" example:"admin"`
	Permissions     []string `bson:"permissions" json:"permissions" example:"[\"PERMISSION_ADMIN\"]"`
}
