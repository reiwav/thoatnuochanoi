package report

type QuickReportResult struct {
	ReportURL string `json:"report_url"`
	DocID     string `json:"doc_id"`
}

type itemVal struct {
	name string
	val  float64
}
