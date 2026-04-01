package models

import (
	"ai-api-tnhn/internal/base/model"
)

type InundationUpdate struct {
	model.BaseModel `bson:",inline"`
	ReportID        string   `bson:"report_id" json:"report_id"`
	UserID          string   `bson:"user_id" json:"user_id"`
	UserEmail       string   `bson:"user_email" json:"user_email"`
	Timestamp       int64    `bson:"timestamp" json:"timestamp"`
	Description     string   `bson:"description" json:"description"`
	Depth           string   `bson:"depth" json:"depth"`
	Length          string   `bson:"length" json:"length"`
	Width           string   `bson:"width" json:"width"`
	TrafficStatus   string   `bson:"traffic_status" json:"traffic_status"`
	Images          []string `bson:"images,omitempty" json:"images,omitempty"` // Google Drive File IDs
	ReviewComment   string   `bson:"review_comment,omitempty" json:"review_comment,omitempty"`
	ReviewerId      string   `bson:"reviewer_id,omitempty" json:"reviewer_id,omitempty"`
	NeedsCorrection bool     `bson:"needs_correction,omitempty" json:"needs_correction,omitempty"`
}

type InundationReport struct {
	model.BaseModel `bson:",inline"`
	OrgID           string             `bson:"org_id" json:"org_id"`
	PointID         string             `bson:"point_id" json:"point_id"` // Link to InundationPoint (optional if new location)
	UserID          string             `bson:"user_id" json:"user_id"`
	UserEmail       string             `bson:"user_email" json:"user_email"`
	StreetName      string             `bson:"street_name" json:"street_name"`
	Depth           string             `bson:"depth" json:"depth"`
	Length          string             `bson:"length" json:"length"`
	Width           string             `bson:"width" json:"width"`
	StartTime       int64              `bson:"start_time" json:"start_time"`
	EndTime         int64              `bson:"end_time" json:"end_time"`
	Description     string             `bson:"description" json:"description"`
	Images          []string           `bson:"images" json:"images"` // Initial images
	Updates         []InundationUpdate `bson:"-" json:"updates"`
	Status          string             `bson:"status" json:"status"` // active, resolved
	TrafficStatus   string             `bson:"traffic_status" json:"traffic_status"`
}
