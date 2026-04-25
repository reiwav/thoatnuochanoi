package constant

const (
	// Standard Tools
	ToolGoogleStatus       = "get_google_status"
	ToolLiveRainSummary    = "get_live_rain_summary"
	ToolRainDataByDate     = "get_rain_data_by_date"
	ToolLakeDataByDate     = "get_lake_data_by_date"
	ToolRiverDataByDate    = "get_river_data_by_date"
	ToolSystemOverview     = "get_system_overview"
	ToolListStations       = "list_stations_by_type"
	ToolRainAnalytics      = "get_rain_analytics"
	ToolCoveredWards       = "get_covered_wards"
	ToolLiveWaterSummary   = "get_live_water_summary"
	ToolLiveInundationSummary = "get_live_inundation_summary"
	ToolLivePumpingSummary = "get_live_pumping_summary"
	ToolRainSummaryByWard  = "get_rain_summary_by_ward"
	ToolDatabaseQuery      = "database_query"
	ToolReadEmailByTitle   = "read_email_by_title"
	ToolReadEmailByID      = "read_email_by_id"
	ToolReportEmergencyProgress = "report_emergency_work_progress"
	ToolEmergencyHistory   = "get_emergency_work_history"
	ToolEmergencyList      = "get_emergency_constructions"
	ToolRecentEmergencyReports = "get_recent_emergency_reports"
	ToolUnfinishedEmergencyHistory = "get_unfinished_emergency_work_history"

	// Contract Tools
	ToolContractSummary    = "get_contract_summary"
	ToolExpiringContracts  = "get_expiring_contracts"
	ToolExpiredContracts   = "get_expired_contracts"
	ToolContractStagesSoon = "get_contract_stages_due_soon"
	ToolContractStagesPassed = "get_contract_stages_passed"
	ToolSearchContracts    = "search_contracts"

	// Report Types
	ReportTypeActiveRain = "active_rain"
	ReportTypeViber      = "viber"
	ReportTypeDynamic    = "dynamic"

	// Log Prefixes
	LogPrefixGenerateReport = "GenerateAIReport:"
)

var ToolDescriptions = map[string]string{
	ToolGoogleStatus:               "Lấy trạng thái hệ thống: số email, Drive, AI stats.",
	ToolLiveRainSummary:            "Tóm tắt tình hình mưa hiện tại.",
	ToolRainDataByDate:             "Lấy dữ liệu mưa theo ngày.",
	ToolLakeDataByDate:             "Lấy dữ liệu mực nước hồ.",
	ToolRiverDataByDate:            "Lấy dữ liệu mực nước sông.",
	ToolSystemOverview:             "Lấy tổng quan trạm đo.",
	ToolListStations:               "Lấy danh sách trạm (rain, lake, river).",
	ToolRainAnalytics:              "Phân tích lượng mưa.",
	ToolCoveredWards:               "Lấy danh sách phường/xã có trạm đo.",
	ToolLiveWaterSummary:           "Lấy mực nước hiện tại hố/sông.",
	ToolLiveInundationSummary:      "Tình hình ngập hiện tại.",
	ToolLivePumpingSummary:         "Tình hình trạm bơm hiện tại.",
	ToolRainSummaryByWard:          "Tổng hợp mưa theo phường.",
	ToolDatabaseQuery:              "Truy vấn MongoDB.",
	ToolReadEmailByTitle:           "Đọc email theo tiêu đề.",
	ToolReadEmailByID:              "Đọc email theo ID.",
	ToolReportEmergencyProgress:    "Báo cáo tiến độ công trình khẩn.",
	ToolEmergencyHistory:           "Lịch sử tiến độ công trình khẩn.",
	ToolEmergencyList:              "Danh sách công trình khẩn.",
	ToolRecentEmergencyReports:     "Báo cáo tiến độ gần đây.",
	ToolUnfinishedEmergencyHistory: "Lịch sử tiến độ chưa hoàn thành.",

	ToolContractSummary:      "Tổng quan hợp đồng.",
	ToolExpiringContracts:    "Hợp đồng sắp hết hạn.",
	ToolExpiredContracts:     "Hợp đồng đã hết hạn.",
	ToolContractStagesSoon:   "Giai đoạn thanh toán sắp đến hạn.",
	ToolContractStagesPassed: "Giai đoạn thanh toán qua hạn.",
	ToolSearchContracts:      "Tìm hợp đồng.",
}
