package inundation

import (
	"ai-api-tnhn/internal/models"
	"io"
)

type InundationUpdateStat struct {
	Timestamp   string  `json:"timestamp"`
	Description string  `json:"description"`
	Depth       float64 `json:"depth"`
}

type InundationStationStat struct {
	StreetName     string                 `json:"street_name"`
	OrgName        string                 `json:"org_name"`
	Depth          float64                `json:"depth"`
	Width          string                 `json:"width"`
	Length         string                 `json:"length"`
	FormattedDepth string                 `json:"formatted_depth"` // e.g. "100 x 50 x 0.20m"
	StartTime      string                 `json:"start_time"`
	Description    string                 `json:"description"`
	CurrentStatus  string                 `json:"current_status"`
	Updates        []InundationUpdateStat `json:"updates"`
}

type InundationSummaryData struct {
	ActivePoints  int                     `json:"active_points"`
	SummaryText   string                  `json:"summary_text"` // e.g. "có 3 điểm úng ngập"
	FullSummary   string                  `json:"full_summary"` // List of points with details
	OngoingPoints []InundationStationStat `json:"ongoing_points"`
}

type PointStatus struct {
	models.InundationStation
	Status     string                   `json:"status"`
	OrgName    string                   `json:"org_name"`
	LastReport *models.InundationReport `json:"last_report,omitempty"`
}

type ImageContent struct {
	Name     string
	MimeType string
	Reader   io.Reader
}
