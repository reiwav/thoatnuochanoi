package models

import "ai-api-tnhn/internal/base/model"

type StationAreaType string

const (
	StationAreaNone    StationAreaType = ""
	StationAreaPhuong  StationAreaType = "phuong"
	StationAreaXa      StationAreaType = "xa"
	StationAreaThiTran StationAreaType = "thitran"
)

type RainStation struct {
	model.BaseModel `bson:",inline"`
	OldID           int             `json:"Id" bson:"old_id" example:"101"`
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

type LakeStation struct {
	model.BaseModel `bson:",inline"`
	OldID           int      `json:"Id" bson:"old_id" example:"201"`
	TenTram         string   `json:"TenTram" bson:"ten_tram" example:"Hồ Hoàn Kiếm"`
	TenTramHTML     string   `json:"TenTramHTML" bson:"ten_tram_html" example:"<b>Hồ Hoàn Kiếm</b>"`
	TenPhuong       string   `json:"TenPhuong" bson:"ten_phuong" example:"Phường Hàng Trống"`
	DiaChi          string   `json:"DiaChi" bson:"dia_chi" example:"Quanh hồ Hoàn Kiếm"`
	Lat             string   `json:"Lat" bson:"lat" example:"21.0285"`
	Lng             string   `json:"Lng" bson:"lng" example:"105.8542"`
	Loai            string   `json:"Loai" bson:"loai" example:"lake"`
	ThuTu           int      `json:"ThuTu" bson:"thu_tu" example:"1"`
	TrongSoBaoCao   int      `json:"TrongSoBaoCao" bson:"trong_so_bao_cao" example:"10"`
	ManHinh         int      `json:"ManHinh" bson:"man_hinh" example:"1"`
	PhuongId        int      `json:"PhuongId" bson:"phuong_id" example:"1"`
	Active          bool     `json:"Active" bson:"active" example:"true"`
	NguongCanhBao   float64  `json:"NguongCanhBao" bson:"nguong_canh_bao" example:"1.5"`
	OrgID           string   `json:"org_id" bson:"org_id" example:"60f123456789"`
	SharedOrgIDs    []string `json:"shared_org_ids" bson:"shared_org_ids" example:"[\"60f987654321\"]"`
	ShareAll        bool     `json:"share_all" bson:"share_all" example:"false"`
}

type RiverStation struct {
	model.BaseModel `bson:",inline"`
	OldID           int      `json:"Id" bson:"old_id" example:"301"`
	TenTram         string   `json:"TenTram" bson:"ten_tram" example:"Sông Tô Lịch"`
	TenTramHTML     string   `json:"TenTramHTML" bson:"ten_tram_html" example:"<b>Sông Tô Lịch</b>"`
	TenPhuong       string   `json:"TenPhuong" bson:"ten_phuong" example:"Láng Hạ"`
	DiaChi          string   `json:"DiaChi" bson:"dia_chi" example:"Đường Láng"`
	Lat             string   `json:"Lat" bson:"lat" example:"21.0123"`
	Lng             string   `json:"Lng" bson:"lng" example:"105.8123"`
	Loai            string   `json:"Loai" bson:"loai" example:"river"`
	ThuTu           int      `json:"ThuTu" bson:"thu_tu" example:"1"`
	TrongSoBaoCao   int      `json:"TrongSoBaoCao" bson:"trong_so_bao_cao" example:"10"`
	ManHinh         int      `json:"ManHinh" bson:"man_hinh" example:"1"`
	PhuongId        int      `json:"PhuongId" bson:"phuong_id" example:"2"`
	Active          bool     `json:"Active" bson:"active" example:"true"`
	NguongCanhBao   float64  `json:"NguongCanhBao" bson:"nguong_canh_bao" example:"3.0"`
	OrgID           string   `json:"org_id" bson:"org_id" example:"60f123456789"`
	SharedOrgIDs    []string `json:"shared_org_ids" bson:"shared_org_ids" example:"[\"60f987654321\"]"`
	ShareAll        bool     `json:"share_all" bson:"share_all" example:"false"`
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
}
