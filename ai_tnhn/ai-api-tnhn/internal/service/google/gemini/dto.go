package gemini

type weatherStationSummary struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
}
type weatherSystemOverview struct {
	TotalStations int                     `json:"total_stations"`
	Breakdown     []weatherStationSummary `json:"breakdown"`
}
