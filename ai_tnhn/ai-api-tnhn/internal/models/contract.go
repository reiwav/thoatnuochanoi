package models

import (
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/internal/service/google/googledrive"
)

type ContractStage struct {
	Name   string  `bson:"name" json:"name" example:"Giai đoạn 1: Khảo sát"`
	Amount float64 `bson:"amount" json:"amount" example:"500000000"`
	Date   string  `bson:"date" json:"date" example:"2023-01-01"`
}

type Contract struct {
	model.BaseModel `bson:",inline"`
	OrgID           string                 `bson:"org_id" json:"org_id" example:"60f123456789"`
	Name            string                 `bson:"name" json:"name" example:"Hợp đồng Duy trì hệ thống thoát nước 2023"`
	CategoryID      string                 `bson:"category_id" json:"category_id" example:"60f121212121"`
	StartDate       string                 `bson:"start_date" json:"start_date" example:"2023-01-01"`
	EndDate         string                 `bson:"end_date" json:"end_date" example:"2023-12-31"`
	Stages          []ContractStage        `bson:"stages" json:"stages"`
	Note            string                 `bson:"note" json:"note" example:"Hợp đồng trọng điểm"`
	DriveFolderID   string                 `bson:"drive_folder_id" json:"drive_folder_id" example:"1abc2def3ghi"`
	DriveFolderLink string                 `bson:"drive_folder_link" json:"drive_folder_link" example:"https://drive.google.com/..."`
	Files           []googledrive.FileInfo `bson:"-" json:"files"`
}
