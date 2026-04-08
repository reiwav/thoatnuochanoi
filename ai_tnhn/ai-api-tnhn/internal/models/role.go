package models

import (
	"ai-api-tnhn/internal/base/model"
)

type Role struct {
	model.BaseModel `bson:",inline"`
	Name            string `bson:"name" json:"name"`
	Code            string `bson:"code" json:"code"`
	Description     string `bson:"description" json:"description"`
	Level           int    `bson:"level" json:"level"`
	IsCompany       bool   `bson:"is_company" json:"is_company"`
}
