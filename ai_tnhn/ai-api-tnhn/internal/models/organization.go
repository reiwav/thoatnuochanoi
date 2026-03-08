package models

import (
	"ai-api-tnhn/internal/base/model"
)

type Organization struct {
	model.BaseModel `bson:",inline"`
	Name            string   `bson:"name" json:"name"`
	Code            string   `bson:"code" json:"code"`               // Mã định danh (unique)
	Description     string   `bson:"description" json:"description"` // Mô tả
	Status          bool     `bson:"status" json:"status"`           // Trạng thái hoạt động
	Address         string   `bson:"address" json:"address"`         // Địa chỉ
	PhoneNumber     string   `bson:"phone_number" json:"phone_number"`
	Email           string   `bson:"email" json:"email"`
	Representative  string   `bson:"representative" json:"representative"`
	DriveFolderID   string   `bson:"drive_folder_id" json:"drive_folder_id"` // Thư mục Google Drive của xí nghiệp
	RainStationIDs  []string `bson:"rain_station_ids" json:"rain_station_ids"`
	LakeStationIDs  []string `bson:"lake_station_ids" json:"lake_station_ids"`
	RiverStationIDs []string `bson:"river_station_ids" json:"river_station_ids"`
	InundationIDs   []string `bson:"inundation_ids" json:"inundation_ids"`
}
