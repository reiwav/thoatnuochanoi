package gemini

// Tool schemas advertised to Gemini.
//
// Each declaration tells the model a tool's name, when to use it, and the shape
// of its arguments. The Required list matters: a parameter left out of it may be
// omitted by the model, so the handler must treat it as optional.

import (
	"ai-api-tnhn/internal/constant"

	"github.com/google/generative-ai-go/genai"
)

func (s *service) getChatTools() []*genai.FunctionDeclaration {
	return []*genai.FunctionDeclaration{
		{Name: constant.ToolGoogleStatus, Description: constant.ToolDescriptions[constant.ToolGoogleStatus]},
		{Name: constant.ToolLiveRainSummary, Description: constant.ToolDescriptions[constant.ToolLiveRainSummary]},
		{Name: constant.ToolLakeDataByDate, Description: constant.ToolDescriptions[constant.ToolLakeDataByDate],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"date": {Type: genai.TypeString, Description: "YYYY-MM-DD"}}, Required: []string{"date"}}},
		{Name: constant.ToolRiverDataByDate, Description: constant.ToolDescriptions[constant.ToolRiverDataByDate],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"date": {Type: genai.TypeString, Description: "YYYY-MM-DD"}}, Required: []string{"date"}}},
		{Name: constant.ToolSystemOverview, Description: constant.ToolDescriptions[constant.ToolSystemOverview]},
		{Name: constant.ToolListStations, Description: constant.ToolDescriptions[constant.ToolListStations],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{
				"type":   {Type: genai.TypeString, Description: "rain/lake/river/inundation"},
				"date":   {Type: genai.TypeString, Description: "YYYY-MM-DD. MUST extract the exact date mentioned by user (do not adjust). Optional, used to filter stations."},
				"time":   {Type: genai.TypeString, Description: "HH:mm:ss. MUST extract EXACTLY if user asks for a specific time (e.g., 0h -> 00:00:00)"},
				"status": {Type: genai.TypeString, Description: "flooded/normal/field_checked. Optional, dùng để lọc các điểm ngập úng (inundation) theo trạng thái đang ngập (flooded), bình thường (normal) hoặc đã kiểm tra hiện trường (field_checked)."},
			}, Required: []string{"type"}}},
		{Name: constant.ToolRainAnalytics, Description: constant.ToolDescriptions[constant.ToolRainAnalytics],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"station_id": {Type: genai.TypeInteger}, "year": {Type: genai.TypeInteger}, "month": {Type: genai.TypeInteger}, "start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}, "group_by": {Type: genai.TypeString}}}},
		{Name: constant.ToolCoveredWards, Description: constant.ToolDescriptions[constant.ToolCoveredWards]},
		{Name: constant.ToolWeatherForecast, Description: constant.ToolDescriptions[constant.ToolWeatherForecast]},
		{Name: constant.ToolLiveWaterSummary, Description: constant.ToolDescriptions[constant.ToolLiveWaterSummary]},
		{Name: constant.ToolLiveInundationSummary, Description: "Tình hình ngập úng hiện tại hoặc theo ngày cụ thể (YYYY-MM-DD). Hỗ trợ lọc theo xí nghiệp/đơn vị quản lý.",
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{
				"date":     {Type: genai.TypeString, Description: "Định dạng YYYY-MM-DD. Tùy chọn, dùng để xem các điểm ngập trong ngày được chỉ định."},
				"org_name": {Type: genai.TypeString, Description: "Tên xí nghiệp/đơn vị quản lý (ví dụ: 'Xí nghiệp 2', 'Xí nghiệp thoát nước số 2'). Tùy chọn, dùng để lọc kết quả."},
			}}},
		{Name: constant.ToolInundationHistoryByRange, Description: "Xem lịch sử thống kê ngập úng trong một khoảng thời gian (từ ngày đến ngày). Kết quả được gộp nhóm theo vị trí điểm ngập và hỗ trợ lọc theo xí nghiệp quản lý.",
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{
				"start_date": {Type: genai.TypeString, Description: "Định dạng YYYY-MM-DD. Bắt buộc, ngày bắt đầu khoảng thời gian cần tra cứu."},
				"end_date":   {Type: genai.TypeString, Description: "Định dạng YYYY-MM-DD. Bắt buộc, ngày kết thúc khoảng thời gian cần tra cứu."},
				"org_name":   {Type: genai.TypeString, Description: "Tên xí nghiệp/đơn vị quản lý (ví dụ: 'Xí nghiệp 1'). Tùy chọn, dùng để lọc kết quả."},
			}, Required: []string{"start_date", "end_date"}}},
		{Name: constant.ToolLivePumpingSummary, Description: constant.ToolDescriptions[constant.ToolLivePumpingSummary]},
		{Name: constant.ToolLiveSluiceGateSummary, Description: constant.ToolDescriptions[constant.ToolLiveSluiceGateSummary]},
		{Name: constant.ToolRainSummaryByWard, Description: constant.ToolDescriptions[constant.ToolRainSummaryByWard],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"year": {Type: genai.TypeInteger}, "month": {Type: genai.TypeInteger}, "start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}}}},
		{Name: constant.ToolDatabaseQuery, Description: constant.ToolDescriptions[constant.ToolDatabaseQuery],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"collection": {Type: genai.TypeString}, "filter": {Type: genai.TypeObject}}, Required: []string{"collection"}}},
		{Name: constant.ToolDatabaseAggregate, Description: "Thực hiện truy vấn tổng hợp MongoDB (Aggregation Pipeline) để đếm, cộng, nhóm số liệu. Dùng cho các câu hỏi thống kê lịch sử/phức tạp.",
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{
				"collection": {Type: genai.TypeString, Description: "Tên bộ sưu tập cần truy vấn tổng hợp (inundation_reports, rain_records, v.v.)."},
				"pipeline":   {Type: genai.TypeArray, Items: &genai.Schema{Type: genai.TypeObject}, Description: "Mảng các bước pipeline MongoDB (ví dụ: [ { '$match': ... }, { '$group': ... } ])."},
			}, Required: []string{"collection", "pipeline"}}},
		{Name: constant.ToolReadEmailByTitle, Description: constant.ToolDescriptions[constant.ToolReadEmailByTitle],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"title": {Type: genai.TypeString}}, Required: []string{"title"}}},
		{Name: constant.ToolReadEmailByID, Description: constant.ToolDescriptions[constant.ToolReadEmailByID],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"id": {Type: genai.TypeInteger}}, Required: []string{"id"}}},
		{Name: constant.ToolReportEmergencyProgress, Description: constant.ToolDescriptions[constant.ToolReportEmergencyProgress],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"construction_id": {Type: genai.TypeString}, "work_done": {Type: genai.TypeString}, "progress_percentage": {Type: genai.TypeInteger}, "issues": {Type: genai.TypeString}, "is_completed": {Type: genai.TypeBoolean}, "expected_completion_date": {Type: genai.TypeString}}, Required: []string{"construction_id", "work_done"}}},
		{Name: constant.ToolEmergencyHistory, Description: constant.ToolDescriptions[constant.ToolEmergencyHistory],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"construction_id": {Type: genai.TypeString}}, Required: []string{"construction_id"}}},
		{Name: constant.ToolEmergencyList, Description: constant.ToolDescriptions[constant.ToolEmergencyList]},
		{Name: constant.ToolRecentEmergencyReports, Description: constant.ToolDescriptions[constant.ToolRecentEmergencyReports],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}}}},
		{Name: constant.ToolUnfinishedEmergencyHistory, Description: constant.ToolDescriptions[constant.ToolUnfinishedEmergencyHistory]},
	}
}

func (s *service) getContractTools() []*genai.FunctionDeclaration {
	return []*genai.FunctionDeclaration{
		{Name: constant.ToolContractSummary, Description: constant.ToolDescriptions[constant.ToolContractSummary]},
		{Name: constant.ToolExpiringContracts, Description: constant.ToolDescriptions[constant.ToolExpiringContracts], Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"days": {Type: genai.TypeInteger}}}},
		{Name: constant.ToolExpiredContracts, Description: constant.ToolDescriptions[constant.ToolExpiredContracts]},
		{Name: constant.ToolContractStagesSoon, Description: constant.ToolDescriptions[constant.ToolContractStagesSoon], Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"days": {Type: genai.TypeInteger}}}},
		{Name: constant.ToolContractStagesPassed, Description: constant.ToolDescriptions[constant.ToolContractStagesPassed]},
		{Name: constant.ToolSearchContracts, Description: constant.ToolDescriptions[constant.ToolSearchContracts], Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"keyword": {Type: genai.TypeString}}, Required: []string{"keyword"}}},
	}
}
