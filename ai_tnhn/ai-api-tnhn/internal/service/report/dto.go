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
