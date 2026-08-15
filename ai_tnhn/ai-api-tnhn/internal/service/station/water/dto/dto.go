package dto

import "time"

// WaterStationStat holds summary statistical info for a single water station
type WaterStationStat struct {
	Name            string  `json:"name"`
	Level           float64 `json:"level"`
	Label           string  `json:"label"` // E.g., "Hồ", "Sông"
	ThoiGian        string  `json:"thoi_gian"`
	Priority        int     `json:"priority"`
	Address         string  `json:"address"`
	ThresholdStatus string  `json:"threshold_status,omitempty"` // "high" | "low" | "normal" | "no_data"
	StatusText      string  `json:"status_text,omitempty"`      // "Vượt ngưỡng cao" | "Dưới ngưỡng thấp" | "Bình thường" | "Chưa có dữ liệu"
	IsExceeded      bool    `json:"is_exceeded"`                // true nếu vượt ngưỡng cao hoặc dưới ngưỡng thấp
	HasData         bool    `json:"has_data"`                   // false nếu chưa có dữ liệu trong ngày
	MinThreshold    float64 `json:"min_threshold,omitempty"`
	MaxThreshold    float64 `json:"max_threshold,omitempty"`
}

// WaterSummaryData holds overall water summary data for all lake and river stations
type WaterSummaryData struct {
	TotalStations int                `json:"total_stations"`
	LakeStations  []WaterStationStat `json:"lake_stations"`
	RiverStations []WaterStationStat `json:"river_stations"`
	SummaryText   string             `json:"summary_text,omitempty"`
	RiverSummary  string             `json:"river_summary,omitempty"`
	LakeSummary   string             `json:"lake_summary,omitempty"`
}

// GridRowData holds monthly grid row data
type GridRowData struct {
	StationID        int64              `json:"station_id"`
	StationName      string             `json:"station_name"`
	DataMode         string             `json:"data_mode"`
	IsAuto           bool               `json:"is_auto"`
	ValuesByTimeSlot map[string]float64 `json:"values_by_time_slot"`
	CurrentValue     float64            `json:"current_value"`
	DiffValue        float64            `json:"diff_value"`
	ThresholdStatus  string             `json:"threshold_status"`
	MinThreshold     float64            `json:"min_threshold"`
	MaxThreshold     float64            `json:"max_threshold"`
}

// GridDataResponseItem represents a single water record item in grid time range queries
type GridDataResponseItem struct {
	RecordID    string    `json:"record_id,omitempty"`
	StationType string    `json:"station_type"`
	StationID   int64     `json:"station_id"`
	Timestamp   time.Time `json:"timestamp"`
	Value       float64   `json:"value"`
}

// SingleWaterRecordInput is the payload for manual grid single cell upsert
type SingleWaterRecordInput struct {
	RecordID    string    `json:"record_id,omitempty"`
	StationType string    `json:"station_type"` // "river" hoặc "lake"
	StationID   int64     `json:"station_id"`
	Value       float64   `json:"value"`
	Timestamp   time.Time `json:"timestamp"`
	Date        string    `json:"date,omitempty"`
}

// LatestWaterRecord holds the latest record data for a water station in DB
type LatestWaterRecord struct {
	RecordID        string    `json:"record_id"`
	StationID       int64     `json:"station_id"`
	StationName     string    `json:"station_name"`
	Value           float64   `json:"value"`
	Timestamp       time.Time `json:"timestamp"`
	Date            string    `json:"date"`
	Source          string    `json:"source"`
	ThresholdStatus string    `json:"threshold_status"`
	MinThreshold    float64   `json:"min_threshold"`
	MaxThreshold    float64   `json:"max_threshold"`
}

// WaterStationV2 represents a station with its latest water level record for V2 summary
type WaterStationV2 struct {
	ID           string             `json:"id"`
	OldID        int                `json:"old_id"`
	TenTram      string             `json:"ten_tram"`
	DiaChi       string             `json:"dia_chi,omitempty"`
	ThuTu        int                `json:"thu_tu"`
	Loai         string             `json:"loai"` // "lake" hoặc "river"
	DataMode     string             `json:"data_mode"`
	IsAuto       bool               `json:"is_auto"`
	LatestRecord *LatestWaterRecord `json:"latest_record"`
}

// WaterRecordInfo holds common fields from LakeRecord or RiverRecord needed for station statistics
type WaterRecordInfo struct {
	Value           float64
	Timestamp       time.Time
	MinThreshold    float64
	MaxThreshold    float64
	ThresholdStatus string
}
