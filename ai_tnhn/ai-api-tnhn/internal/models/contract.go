package models

import (
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/internal/service/google/googledrive"
	"time"
)

type AcceptanceRecord struct {
	ID        string    `bson:"id" json:"id"`
	Title     string    `bson:"title" json:"title"`
	Date      string    `bson:"date" json:"date"`
	Content   string    `bson:"content" json:"content"`
	Status    string    `bson:"status" json:"status" example:"Chưa ký"`
	ScanFiles []string  `bson:"scan_files" json:"scan_files"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
}

type PaymentRecord struct {
	ID        string    `bson:"id" json:"id"`
	Title     string    `bson:"title" json:"title"`
	Date      string    `bson:"date" json:"date"`
	Content   string    `bson:"content" json:"content"`
	ScanFiles []string  `bson:"scan_files" json:"scan_files"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
}

type ContractAppendix struct {
	ID             string                 `bson:"id" json:"id"`
	AppendixNumber string                 `bson:"appendix_number" json:"appendix_number"`
	Name           string                 `bson:"name" json:"name"`
	Content        string                 `bson:"content" json:"content"`
	Year           int                    `bson:"year" json:"year"`
	Status         string                 `bson:"status" json:"status" example:"Đã ký"`
	Files          []googledrive.FileInfo `bson:"files" json:"files"`
	CreatedAt      time.Time              `bson:"created_at" json:"created_at"`
}

type ContractStage struct {
	Name              string             `bson:"name" json:"name" example:"Giai đoạn 1: Khảo sát"`
	Amount            float64            `bson:"amount" json:"amount" example:"500000000"`
	Date              string             `bson:"date" json:"date" example:"2023-01-01"`
	Status            string             `bson:"status" json:"status" example:"Chưa thực hiện"`
	AcceptanceRecords []AcceptanceRecord `bson:"acceptance_records" json:"acceptance_records"`
	PaymentRecords    []PaymentRecord    `bson:"payment_records" json:"payment_records"`
	Appendices        []ContractAppendix `bson:"appendices" json:"appendices"`
}

type Contract struct {
	model.BaseModel `bson:",inline"`
	OrgID           string                 `bson:"org_id" json:"org_id" example:"60f123456789"`
	Name            string                 `bson:"name" json:"name" example:"Hợp đồng Duy trì hệ thống thoát nước 2023"`
	ContractNumber  string                 `bson:"contract_number" json:"contract_number" example:"HD/2026/001"`
	InvestorName    string                 `bson:"investor_name" json:"investor_name" example:"Công ty Thoát nước"`
	JVMembers       string                 `bson:"jv_members" json:"jv_members" example:"Thành viên A, Thành viên B"`
	CategoryID      string                 `bson:"category_id" json:"category_id" example:"60f121212121"`
	StartDate       string                 `bson:"start_date" json:"start_date" example:"2023-01-01"`
	EndDate         string                 `bson:"end_date" json:"end_date" example:"2023-12-31"`
	Stages          []ContractStage        `bson:"stages" json:"stages"`
	Note            string                 `bson:"note" json:"note" example:"Hợp đồng trọng điểm"`
	DriveFolderID   string                 `bson:"drive_folder_id" json:"drive_folder_id" example:"1abc2def3ghi"`
	DriveFolderLink string                 `bson:"drive_folder_link" json:"drive_folder_link" example:"https://drive.google.com/..."`
	Files           []googledrive.FileInfo `bson:"files" json:"files"`

	Content             string   `bson:"content" json:"content"`
	JointVentureMembers []string `bson:"joint_venture_members" json:"joint_venture_members"`
}
