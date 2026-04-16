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
	OldID           int             `json:"Id" bson:"old_id"`
	TenTram         string          `json:"TenTram" bson:"ten_tram"`
	TenPhuong       string          `json:"TenPhuong" bson:"ten_phuong"`
	Loai            StationAreaType `json:"Loai" bson:"loai"` // 1: phường, 2: xã
	DiaChi          string          `json:"DiaChi" bson:"dia_chi"`
	Lat             string          `json:"Lat" bson:"lat"`
	Lng             string          `json:"Lng" bson:"lng"`
	ThuTu           int             `json:"ThuTu" bson:"thu_tu"`
	TrongSoBaoCao   int             `json:"TrongSoBaoCao" bson:"trong_so_bao_cao"`
	ManHinh         int             `json:"ManHinh" bson:"man_hinh"`
	PhuongId        int             `json:"PhuongId" bson:"phuong_id"`
	Active          bool            `json:"Active" bson:"active"`
	NguongCanhBao   float64         `json:"NguongCanhBao" bson:"nguong_canh_bao"`
	OrgID           string          `json:"org_id" bson:"org_id"`
	SharedOrgIDs    []string        `json:"shared_org_ids" bson:"shared_org_ids"`
	ShareAll        bool            `json:"share_all" bson:"share_all"`
}

type LakeStation struct {
	model.BaseModel `bson:",inline"`
	OldID           int      `json:"Id" bson:"old_id"`
	TenTram         string   `json:"TenTram" bson:"ten_tram"`
	TenTramHTML     string   `json:"TenTramHTML" bson:"ten_tram_html"`
	TenPhuong       string   `json:"TenPhuong" bson:"ten_phuong"`
	DiaChi          string   `json:"DiaChi" bson:"dia_chi"`
	Lat             string   `json:"Lat" bson:"lat"`
	Lng             string   `json:"Lng" bson:"lng"`
	Loai            string   `json:"Loai" bson:"loai"`
	ThuTu           int      `json:"ThuTu" bson:"thu_tu"`
	TrongSoBaoCao   int      `json:"TrongSoBaoCao" bson:"trong_so_bao_cao"`
	ManHinh         int      `json:"ManHinh" bson:"man_hinh"`
	PhuongId        int      `json:"PhuongId" bson:"phuong_id"`
	Active          bool     `json:"Active" bson:"active"`
	NguongCanhBao   float64  `json:"NguongCanhBao" bson:"nguong_canh_bao"`
	OrgID           string   `json:"org_id" bson:"org_id"`
	SharedOrgIDs    []string `json:"shared_org_ids" bson:"shared_org_ids"`
	ShareAll        bool     `json:"share_all" bson:"share_all"`
}

type RiverStation struct {
	model.BaseModel `bson:",inline"`
	OldID           int      `json:"Id" bson:"old_id"`
	TenTram         string   `json:"TenTram" bson:"ten_tram"`
	TenTramHTML     string   `json:"TenTramHTML" bson:"ten_tram_html"`
	TenPhuong       string   `json:"TenPhuong" bson:"ten_phuong"`
	DiaChi          string   `json:"DiaChi" bson:"dia_chi"`
	Lat             string   `json:"Lat" bson:"lat"`
	Lng             string   `json:"Lng" bson:"lng"`
	Loai            string   `json:"Loai" bson:"loai"`
	ThuTu           int      `json:"ThuTu" bson:"thu_tu"`
	TrongSoBaoCao   int      `json:"TrongSoBaoCao" bson:"trong_so_bao_cao"`
	ManHinh         int      `json:"ManHinh" bson:"man_hinh"`
	PhuongId        int      `json:"PhuongId" bson:"phuong_id"`
	Active          bool     `json:"Active" bson:"active"`
	NguongCanhBao   float64  `json:"NguongCanhBao" bson:"nguong_canh_bao"`
	OrgID           string   `json:"org_id" bson:"org_id"`
	SharedOrgIDs    []string `json:"shared_org_ids" bson:"shared_org_ids"`
	ShareAll        bool     `json:"share_all" bson:"share_all"`
}

type InundationStation struct {
	model.BaseModel `bson:",inline"`
	OrgID           string   `json:"org_id" bson:"org_id"` // Managed by this Org
	ReportID        string   `json:"report_id" bson:"report_id"`
	SharedOrgIDs    []string `json:"shared_org_ids" bson:"shared_org_ids"`
	Name            string   `json:"name" bson:"name"`
	Address         string   `json:"address" bson:"address"`
	Lat             string   `json:"lat" bson:"lat"`
	Lng             string   `json:"lng" bson:"lng"`
	Active          bool     `json:"active" bson:"active"`
	ShareAll        bool     `json:"share_all" bson:"share_all"`
}
