package water

import "time"

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

type WaterSummaryData struct {
	TotalStations int                `json:"total_stations"`
	LakeStations  []WaterStationStat `json:"lake_stations"`
	RiverStations []WaterStationStat `json:"river_stations"`
	SummaryText   string             `json:"summary_text,omitempty"`
	RiverSummary  string             `json:"river_summary,omitempty"`
	LakeSummary   string             `json:"lake_summary,omitempty"`
}

type BatchWaterRecordInput struct {
	TargetType string            `json:"target_type"` // "river" hoặc "lake"
	Date       string            `json:"date"`        // "YYYY-MM-DD"
	Records    []WaterRecordItem `json:"records"`
}

type WaterRecordItem struct {
	StationID int64     `json:"station_id"`
	Timestamp time.Time `json:"timestamp"` // Mốc thời gian đầy đủ
	Value     float64   `json:"value"`     // Mực nước nhập vào
}

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

type GridDataResponseItem struct {
	StationType string    `json:"station_type"`
	StationID   int64     `json:"station_id"`
	Timestamp   time.Time `json:"timestamp"`
	Value       float64   `json:"value"`
}

type SingleWaterRecordInput struct {
	RecordID    string    `json:"record_id,omitempty"`
	StationType string    `json:"station_type"` // "river" hoặc "lake"
	StationID   int64     `json:"station_id"`
	Value       float64   `json:"value"`
	Timestamp   time.Time `json:"timestamp"`
	Date        string    `json:"date,omitempty"`
}
