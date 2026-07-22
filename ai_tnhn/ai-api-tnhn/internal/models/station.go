package models

import (
	"ai-api-tnhn/internal/base/model"
	"time"
)

type StationAreaType string

const (
	StationAreaNone    StationAreaType = ""
	StationAreaPhuong  StationAreaType = "phuong"
	StationAreaXa      StationAreaType = "xa"
	StationAreaThiTran StationAreaType = "thitran"
)

type RainStation struct {
	model.BaseModel `bson:",inline"`
	OldID           int             `json:"OldId" bson:"old_id" example:"101"`
	TenTram         string          `json:"TenTram" bson:"ten_tram" example:"Trạm đo mưa Hoàn Kiếm"`
	TenPhuong       string          `json:"TenPhuong" bson:"ten_phuong" example:"Phường Tràng Tiền"`
	Loai            StationAreaType `json:"Loai" bson:"loai" example:"phuong"` // 1: phường, 2: xã
	DiaChi          string          `json:"DiaChi" bson:"dia_chi" example:"Số 1 Tràng Tiền"`
	Lat             string          `json:"Lat" bson:"lat" example:"21.0285"`
	Lng             string          `json:"Lng" bson:"lng" example:"105.8542"`
	ThuTu           int             `json:"ThuTu" bson:"thu_tu" example:"1"`
	TrongSoBaoCao   int             `json:"TrongSoBaoCao" bson:"trong_so_bao_cao" example:"10"`
	ManHinh         int             `json:"ManHinh" bson:"man_hinh" example:"1"`
	PhuongId        int             `json:"PhuongId" bson:"phuong_id" example:"1"`
	Active          bool            `json:"Active" bson:"active" example:"true"`
	NguongCanhBao   float64         `json:"NguongCanhBao" bson:"nguong_canh_bao" example:"50.5"`
	OrgID           string          `json:"org_id" bson:"org_id" example:"60f123456789"`
	SharedOrgIDs    []string        `json:"shared_org_ids" bson:"shared_org_ids" example:"[\"60f987654321\"]"`
	ShareAll        bool            `json:"share_all" bson:"share_all" example:"false"`
}

type LatestWaterRecord struct {
	RecordID    string    `json:"record_id" bson:"record_id"`
	StationID   int64     `json:"station_id" bson:"station_id"`
	StationName string    `json:"station_name" bson:"station_name"`
	Value       float64   `json:"value" bson:"value"`
	Timestamp   time.Time `json:"timestamp" bson:"timestamp"`
	Date        string    `json:"date" bson:"date"`
}

type StationThresholdConfig struct {
	ThresholdType SeasonType `json:"threshold_type" bson:"threshold_type" example:"mua_kho"`
	ThresholdName string     `json:"threshold_name" bson:"threshold_name" example:"Mùa khô"`
	MinLevel      float64    `json:"min_level" bson:"min_level" example:"1.5"`
	MaxLevel      float64    `json:"max_level" bson:"max_level" example:"3.5"`
}

type LakeStation struct {
	model.BaseModel  `bson:",inline"`
	OldID            int                      `json:"OldId" bson:"old_id" example:"201"`
	TenTram          string                   `json:"TenTram" bson:"ten_tram" example:"Hồ Hoàn Kiếm"`
	TenPhuong        string                   `json:"TenPhuong" bson:"ten_phuong" example:"Phường Hàng Trống"`
	DiaChi           string                   `json:"DiaChi" bson:"dia_chi" example:"Quanh hồ Hoàn Kiếm"`
	Lat              string                   `json:"Lat" bson:"lat" example:"21.0285"`
	Lng              string                   `json:"Lng" bson:"lng" example:"105.8542"`
	Loai             string                   `json:"Loai" bson:"loai" example:"lake"`
	ThuTu            int                      `json:"ThuTu" bson:"thu_tu" example:"1"`
	TrongSoBaoCao    int                      `json:"TrongSoBaoCao" bson:"trong_so_bao_cao" example:"10"`
	ManHinh          int                      `json:"ManHinh" bson:"man_hinh" example:"1"`
	PhuongId         int                      `json:"PhuongId" bson:"phuong_id" example:"1"`
	Active           bool                     `json:"Active" bson:"active" example:"true"`
	NguongCanhBao    float64                  `json:"NguongCanhBao" bson:"nguong_canh_bao" example:"1.5"`
	OrgID            string                   `json:"org_id" bson:"org_id" example:"60f123456789"`
	SharedOrgIDs     []string                 `json:"shared_org_ids" bson:"shared_org_ids" example:"[\"60f987654321\"]"`
	ShareAll         bool                     `json:"share_all" bson:"share_all" example:"false"`
	LatestRecord     *LatestWaterRecord       `json:"latest_record,omitempty" bson:"latest_record,omitempty"`
	DataMode         string                   `json:"data_mode" bson:"data_mode" example:"manual"`              // "auto" | "manual"
	IsAuto           bool                     `json:"is_auto" bson:"is_auto" example:"false"`                    // Flag phân biệt nhanh trạm tự động
	ThresholdConfigs []StationThresholdConfig `json:"threshold_configs" bson:"threshold_configs"`                // Ngưỡng cao/thấp cho từng mùa
}

type RiverStation struct {
	model.BaseModel  `bson:",inline"`
	OldID            int                      `json:"OldId" bson:"old_id" example:"301"`
	TenTram          string                   `json:"TenTram" bson:"ten_tram" example:"Sông Tô Lịch"`
	TenPhuong        string                   `json:"TenPhuong" bson:"ten_phuong" example:"Láng Hạ"`
	DiaChi           string                   `json:"DiaChi" bson:"dia_chi" example:"Đường Láng"`
	Lat              string                   `json:"Lat" bson:"lat" example:"21.0123"`
	Lng              string                   `json:"Lng" bson:"lng" example:"105.8123"`
	Loai             string                   `json:"Loai" bson:"loai" example:"river"`
	ThuTu            int                      `json:"ThuTu" bson:"thu_tu" example:"1"`
	TrongSoBaoCao    int                      `json:"TrongSoBaoCao" bson:"trong_so_bao_cao" example:"10"`
	ManHinh          int                      `json:"ManHinh" bson:"man_hinh" example:"1"`
	PhuongId         int                      `json:"PhuongId" bson:"phuong_id" example:"2"`
	Active           bool                     `json:"Active" bson:"active" example:"true"`
	NguongCanhBao    float64                  `json:"NguongCanhBao" bson:"nguong_canh_bao" example:"3.0"`
	OrgID            string                   `json:"org_id" bson:"org_id" example:"60f123456789"`
	SharedOrgIDs     []string                 `json:"shared_org_ids" bson:"shared_org_ids" example:"[\"60f987654321\"]"`
	ShareAll         bool                     `json:"share_all" bson:"share_all" example:"false"`
	LatestRecord     *LatestWaterRecord       `json:"latest_record,omitempty" bson:"latest_record,omitempty"`
	DataMode         string                   `json:"data_mode" bson:"data_mode" example:"auto"`                 // "auto" | "manual"
	IsAuto           bool                     `json:"is_auto" bson:"is_auto" example:"true"`                     // Flag phân biệt nhanh trạm tự động
	ThresholdConfigs []StationThresholdConfig `json:"threshold_configs" bson:"threshold_configs"`                // Ngưỡng cao/thấp cho từng mùa
}

type InundationStation struct {
	model.BaseModel `bson:",inline"`
	OrgID           string   `json:"org_id" bson:"org_id" example:"org_hanoi"` // Managed by this Org
	ReportID        string   `json:"report_id" bson:"report_id" example:"rep_123"`
	LastReportID    string   `json:"last_report_id" bson:"last_report_id" example:"rep_123"`
	SharedOrgIDs    []string `json:"shared_org_ids" bson:"shared_org_ids" example:"org_1,org_2"`
	Name            string   `json:"name" bson:"name" example:"Điểm ngập Phố Huế"`
	Address         string   `json:"address" bson:"address" example:"79 Phố Huế"`
	Lat             string   `json:"lat" bson:"lat" example:"21.0285"`
	Lng             string   `json:"lng" bson:"lng" example:"105.8542"`
	Active          bool     `json:"active" bson:"active" example:"true"`
	ShareAll        bool     `json:"share_all" bson:"share_all" example:"false"`
	OrgName         string   `json:"org_name" bson:"-"`
}
