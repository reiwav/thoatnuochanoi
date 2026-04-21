package models

import (
	"ai-api-tnhn/internal/base/model"
)

type Organization struct {
	model.BaseModel `bson:",inline"`
	Name            string `bson:"name" json:"name" example:"Xí nghiệp Thoát nước số 1"`
	Code            string `bson:"code" json:"code" example:"XN1"`               // Mã định danh (unique)
	Description     string `bson:"description" json:"description" example:"Quản lý khu vực Hoàn Kiếm"` // Mô tả
	Status          bool   `bson:"status" json:"status" example:"true"`           // Trạng thái hoạt động
	Address         string `bson:"address" json:"address" example:"123 Lê Duẩn, Hà Nội"`         // Địa chỉ
	PhoneNumber     string `bson:"phone_number" json:"phone_number" example:"0241234567"`
	Email           string `bson:"email" json:"email" example:"xn1@hsdc.com.vn"`
	Representative  string `bson:"representative" json:"representative" example:"Nguyễn Văn A"`
	DriveFolderID   string `bson:"drive_folder_id" json:"drive_folder_id" example:"1abc2def3ghi"` // Thư mục Google Drive của xí nghiệp
	// RainStationIDs  []string `bson:"rain_station_ids" json:"rain_station_ids"`
	// LakeStationIDs  []string `bson:"lake_station_ids" json:"lake_station_ids"`
	// RiverStationIDs           []string `bson:"river_station_ids" json:"river_station_ids"`
	// InundationIDs             []string `bson:"inundation_ids" json:"inundation_ids"`
	// EmergencyConstructionIDs  []string `bson:"emergency_construction_ids" json:"emergency_construction_ids"`
	// PumpingStationIDs         []string `bson:"pumping_station_ids" json:"pumping_station_ids"`
	Order string `bson:"order" json:"order"`
}
