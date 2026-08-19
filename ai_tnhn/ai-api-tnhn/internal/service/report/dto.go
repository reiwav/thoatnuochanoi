package report

type QuickReportResult struct {
	ReportURL      string `json:"report_url"`
	DocID          string `json:"doc_id"`
	PumpingSummary string `json:"noi_dung_tram_bom"`
}

type itemVal struct {
	name string
	val  float64
}

type WaterReportDetail struct {
	StationName      string  `json:"station_name"`
	Address          string  `json:"address"`
	Type             string  `json:"type"` // "river" or "lake"
	BeforeRainTime   string  `json:"before_rain_time"`
	BeforeRainValue  string  `json:"before_rain_value"`
	CurrentTime      string  `json:"current_time"`
	CurrentValue     string  `json:"current_value"`
	Difference       string  `json:"difference"`
	RawBeforeRain    float64 `json:"raw_before_rain"`
	RawCurrent       float64 `json:"raw_current"`
	Priority         int     `json:"-"`
	OldID            int     `json:"-"`
}

type WaterReportDetailResponse struct {
	ReportTime string              `json:"report_time"`
	RainTime   string              `json:"rain_time"`
	Rivers     []WaterReportDetail `json:"rivers"`
	Lakes      []WaterReportDetail `json:"lakes"`
}
