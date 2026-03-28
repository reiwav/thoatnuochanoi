package models

import (
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/internal/service/googledrive"
)

type ContractStage struct {
	Name   string  `bson:"name" json:"name"`
	Amount float64 `bson:"amount" json:"amount"`
	Date   string  `bson:"date" json:"date"`
}

type Contract struct {
	model.BaseModel `bson:",inline"`
	OrgID           string          `bson:"org_id" json:"org_id"`
	Name            string          `bson:"name" json:"name"`
	CategoryID      string          `bson:"category_id" json:"category_id"`
	StartDate       string          `bson:"start_date" json:"start_date"`
	EndDate         string          `bson:"end_date" json:"end_date"`
	Stages          []ContractStage `bson:"stages" json:"stages"`
	Note            string          `bson:"note" json:"note"`
	DriveFolderID   string          `bson:"drive_folder_id" json:"drive_folder_id"`
	DriveFolderLink string                `bson:"drive_folder_link" json:"drive_folder_link"`
	Files           []googledrive.FileInfo `bson:"-" json:"files"`
}
