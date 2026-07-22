package models

import (
	"ai-api-tnhn/internal/base/model"
	"time"
)

type SeasonType string

const (
	SeasonTypeDry   SeasonType = "mua_kho"
	SeasonTypeRainy SeasonType = "mua_mua"
)

// WaterThresholdSetting: Collection riêng lưu phiên bản cấu hình Mùa & Tháng theo Năm
type WaterThresholdSetting struct {
	model.BaseModel `bson:",inline"`
	Year            int         `json:"year" bson:"year" example:"2026"`                        // Năm áp dụng (vd: 2026)
	Version         int         `json:"version" bson:"version" example:"1"`                     // Phiên bản cấu hình (1, 2, 3...)
	Name            string      `json:"name" bson:"name" example:"Cấu hình mùa năm 2026 (v1)"` // Tên/Mô tả phiên bản
	Status          string      `json:"status" bson:"status" example:"new"`                    // "new" | "active" | "archived"
	CreatedByID     string      `json:"created_by_id" bson:"created_by_id" example:"usr_123"`   // ID người tạo phiên bản
	CreatedByName   string      `json:"created_by_name" bson:"created_by_name" example:"Nguyễn Văn A"` // Tên người tạo
	ActivatedByID   string      `json:"activated_by_id,omitempty" bson:"activated_by_id,omitempty"`     // ID người kích hoạt
	ActivatedByName string      `json:"activated_by_name,omitempty" bson:"activated_by_name,omitempty"` // Tên người kích hoạt
	ActivatedTime   *time.Time  `json:"activated_time,omitempty" bson:"activated_time,omitempty"`       // Thời điểm bấm kích hoạt
	Note            string      `json:"note,omitempty" bson:"note,omitempty"`                   // Ghi chú lý do cập nhật
	Thresholds      []Threshold `json:"thresholds" bson:"thresholds"`                          // Danh sách các mùa & tháng
	Ctime           time.Time   `json:"ctime" bson:"ctime"`
	Utime           time.Time   `json:"utime" bson:"utime"`
}

type Threshold struct {
	Type   SeasonType `json:"type" bson:"type" example:"mua_kho"`             // "mua_kho" hoặc "mua_mua"
	Name   string     `json:"name" bson:"name" example:"Mùa khô"`             // Tên hiển thị mùa
	Months []int      `json:"months" bson:"months" example:"[1,2,3,4,11,12]"` // Các tháng thuộc mùa này (1-12)
}
