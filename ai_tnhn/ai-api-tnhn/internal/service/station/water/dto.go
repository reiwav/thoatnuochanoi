package water

type WaterStationStat struct {
	Name     string  `json:"name"`
	Level    float64 `json:"level"`
	Label    string  `json:"label"` // E.g., "Hồ", "Sông"
	ThoiGian string  `json:"thoi_gian"`
}

type WaterSummaryData struct {
	TotalStations int                `json:"total_stations"`
	LakeStations  []WaterStationStat `json:"lake_stations"`
	RiverStations []WaterStationStat `json:"river_stations"`
	SummaryText   string             `json:"summary_text,omitempty"`
}
