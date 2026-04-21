package models

import (
	"ai-api-tnhn/internal/base/model"
)

type ProgressTask struct {
	Name       string `bson:"name" json:"name" example:"Lát gạch vỉa hè"`
	Percentage int    `bson:"percentage" json:"percentage" example:"50"`
}

type EmergencyConstructionProgress struct {
	model.BaseModel        `bson:",inline"`
	ConstructionID         string         `bson:"construction_id" json:"construction_id" example:"60f123456789"`
	ReportDate             int64          `bson:"report_date" json:"report_date" example:"1672531200"`
	WorkDone               string         `bson:"work_done" json:"work_done" example:"Đã hoàn thành phần nền"`
	Tasks                  []ProgressTask `bson:"tasks" json:"tasks"`
	ProgressPercentage     int            `bson:"progress_percentage" json:"progress_percentage" example:"35"`
	Issues                 string         `bson:"issues" json:"issues" example:"Trời mưa to gây chậm tiến độ"`
	Order                  string         `bson:"order" json:"order" example:"1"`
	Location               string         `bson:"location" json:"location" example:"Số 1 Đào Duy Anh"`
	Conclusion             string         `bson:"conclusion" json:"conclusion" example:"Tiếp tục triển khai theo kế hoạch"`
	Influence              string         `bson:"influence" json:"influence" example:"Hạn chế giao thông cục bộ"`
	Proposal               string         `bson:"proposal" json:"proposal" example:"Tăng cường nhân lực vào ban đêm"`
	Images                 []string       `bson:"images" json:"images" example:"[\"img1.jpg\", \"img2.jpg\"]"`
	IsCompleted            bool           `bson:"is_completed" json:"is_completed" example:"false"`
	ExpectedCompletionDate int64          `bson:"expected_completion_date" json:"expected_completion_date" example:"1675123200"`
	ReportedBy             string         `bson:"reported_by" json:"reported_by" example:"60a123456789"`
	ReporterName           string         `bson:"reporter_name" json:"reporter_name" example:"Nguyễn Văn A"`
	ReporterEmail          string         `bson:"reporter_email" json:"reporter_email" example:"a@hsdc.com.vn"`
	ReporterOrgName        string         `bson:"reporter_org_name" json:"reporter_org_name" example:"Xí nghiệp 1"`
	ConstructionName       string         `bson:"-" json:"construction_name"`
}
