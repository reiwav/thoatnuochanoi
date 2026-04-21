package models

import (
	"ai-api-tnhn/internal/base/model"
)

type Role struct {
	model.BaseModel `bson:",inline"`
	Name            string `bson:"name" json:"name" example:"Quản trị viên"`
	Code            string `bson:"code" json:"code" example:"admin"`
	Description     string `bson:"description" json:"description" example:"Toàn quyền hệ thống"`
	Level           int    `bson:"level" json:"level" example:"1"`
	IsCompany       bool   `bson:"is_company" json:"is_company" example:"true"`
	IsEmployee      bool   `bson:"is_employee" json:"is_employee" example:"false"`
}
