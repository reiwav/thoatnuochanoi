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
	Time   string   `json:"time"`
	Depth  float64  `json:"depth"`
	Length string   `json:"length,omitempty"`
	Width  string   `json:"width,omitempty"`
	Images []string `json:"images,omitempty"`
	Note   string   `json:"note,omitempty"`
}

// PublicInundationData represents inundation (flooding) data
type PublicInundationData struct {
	Status       string                  `json:"status"` // e.g., flooded, normal
	CurrentDepth float64                 `json:"current_depth"`
	MaxDepth     float64                 `json:"max_depth,omitempty"`
	StartTime    string                  `json:"start_time,omitempty"`
	EndTime      string                  `json:"end_time,omitempty"`
	Length       string                  `json:"length,omitempty"`
	Width        string                  `json:"width,omitempty"`
	Images       []string                `json:"images,omitempty"`
	History      []InundationHistoryItem `json:"history,omitempty"`
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

type PublicDateQuery struct {
	Date *int64 `form:"date"`
}

func (q *PublicDateQuery) GetDate() int64 {
	if q.Date != nil {
		return *q.Date
	}
	return time.Now().Unix()
}

type PublicDateRangeQuery struct {
	StartDate *int64 `form:"start_date"`
	EndDate   *int64 `form:"end_date"`
}

func (q *PublicDateRangeQuery) GetRange() (int64, int64) {
	now := time.Now().Unix()
	end := now
	if q.EndDate != nil {
		end = *q.EndDate
	}
	
	start := end - int64(365 * 24 * 3600)
	if q.StartDate != nil {
		start = *q.StartDate
	}

	return start, end
}
