package stationdata

type StationSummary struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
}

type SystemOverview struct {
	TotalStations int              `json:"total_stations"`
	Breakdown     []StationSummary `json:"breakdown"`
}

type WardStat struct {
	Ward  string `json:"ward"`
	Total string `json:"total_rainfall"`
	Count int    `json:"record_count"`
	Max   string `json:"max_value"`
}

type wardTemp struct {
	total float64
	count int
	max   float64
}
