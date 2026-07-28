package dto

import "time"

// PublicStationMaster represents the master data of a station exposed to third parties
type PublicStationMaster struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Address string `json:"address,omitempty"`
	Lat     string `json:"lat,omitempty"`
	Lng     string `json:"lng,omitempty"`
	Type    string `json:"type"` // lake, river, rain, inundation, sluice_gate, wastewater
}

// PublicWaterData represents lake or river water level data
type PublicWaterData struct {
	CurrentLevel float64   `json:"current_level"`
	Timestamp    time.Time `json:"timestamp"`
	Status       string    `json:"status,omitempty"` // e.g., safe, warning, danger
}

// PublicRainData represents rainfall data
type PublicRainData struct {
	Rain1H    float64   `json:"rain_1h"`
	Rain3H    float64   `json:"rain_3h"`
	Rain24H   float64   `json:"rain_24h"`
	Timestamp time.Time `json:"timestamp"`
}

// InundationHistoryItem represents historical water depth at a specific time
type InundationHistoryItem struct {
	Time  string  `json:"time"`
	Depth float64 `json:"depth"`
}

// PublicInundationData represents inundation (flooding) data
type PublicInundationData struct {
	Status       string                  `json:"status"` // e.g., flooded, normal
	CurrentDepth float64                 `json:"current_depth"`
	History      []InundationHistoryItem `json:"history"`
}

// PublicSluiceGateData represents sluice gate status
type PublicSluiceGateData struct {
	IsOpen    bool      `json:"is_open"`
	OpenLevel float64   `json:"open_level"` // e.g., mm or percentage
	Timestamp time.Time `json:"timestamp"`
}

// PublicWastewaterData represents wastewater treatment plant data
type PublicWastewaterData struct {
	FlowRate       float64   `json:"flow_rate"`
	QualityMetrics string    `json:"quality_metrics,omitempty"`
	Timestamp      time.Time `json:"timestamp"`
}
