package gemini

import (
	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/service/station/inundation"
	"context"
	"fmt"
	"strings"

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
				"type": {Type: genai.TypeString, Description: "rain/lake/river/inundation"},
				"date": {Type: genai.TypeString, Description: "YYYY-MM-DD. MUST extract the exact date mentioned by user (do not adjust). Optional, used to filter stations."},
				"time": {Type: genai.TypeString, Description: "HH:mm:ss. MUST extract EXACTLY if user asks for a specific time (e.g., 0h -> 00:00:00)"},
			}, Required: []string{"type"}}},
		{Name: constant.ToolRainAnalytics, Description: constant.ToolDescriptions[constant.ToolRainAnalytics],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"station_id": {Type: genai.TypeInteger}, "year": {Type: genai.TypeInteger}, "month": {Type: genai.TypeInteger}, "start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}, "group_by": {Type: genai.TypeString}}}},
		{Name: constant.ToolCoveredWards, Description: constant.ToolDescriptions[constant.ToolCoveredWards]},
		{Name: constant.ToolWeatherForecast, Description: constant.ToolDescriptions[constant.ToolWeatherForecast]},
		{Name: constant.ToolLiveWaterSummary, Description: constant.ToolDescriptions[constant.ToolLiveWaterSummary]},
		{Name: constant.ToolLiveInundationSummary, Description: "Tình hình ngập úng hiện tại hoặc theo ngày cụ thể (YYYY-MM-DD). Hỗ trợ lọc theo xí nghiệp/đơn vị quản lý.",
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{
				"date": {Type: genai.TypeString, Description: "Định dạng YYYY-MM-DD. Tùy chọn, dùng để xem các điểm ngập trong ngày được chỉ định."},
				"org_name": {Type: genai.TypeString, Description: "Tên xí nghiệp/đơn vị quản lý (ví dụ: 'Xí nghiệp 2', 'Xí nghiệp thoát nước số 2'). Tùy chọn, dùng để lọc kết quả."},
			}}},
		{Name: constant.ToolLivePumpingSummary, Description: constant.ToolDescriptions[constant.ToolLivePumpingSummary]},
		{Name: constant.ToolRainSummaryByWard, Description: constant.ToolDescriptions[constant.ToolRainSummaryByWard],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"year": {Type: genai.TypeInteger}, "month": {Type: genai.TypeInteger}, "start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}}}},
		{Name: constant.ToolDatabaseQuery, Description: constant.ToolDescriptions[constant.ToolDatabaseQuery],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"collection": {Type: genai.TypeString}, "filter": {Type: genai.TypeObject}}, Required: []string{"collection"}}},
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



func (s *service) handleToolCall(ctx context.Context, c *genai.FunctionCall, uID string, isC bool) (interface{}, error) {
	u, _ := s.userRepo.GetByID(ctx, uID)
	orgID := ""
	var aRain, aLake, aRiver, aInu []string
	if u != nil {
		orgID = u.OrgID
		if isC {
			orgID = ""
		}
		aRain, aLake, aRiver, aInu = u.AssignedRainStationIDs, u.AssignedLakeStationIDs, u.AssignedRiverStationIDs, u.AssignedInundationStationIDs
		if u.AssignedPumpingStationID != "" {
			aPump := []string{u.AssignedPumpingStationID}
			_ = aPump // to avoid unused if needed, though used below
		}
	}
	switch c.Name {
	case constant.ToolGoogleStatus:
		return s.googleApiSvc.GetStatus(ctx)
	case constant.ToolReadEmailByTitle:
		return s.googleApiSvc.ReadEmailByTitle(ctx, c.Args["title"].(string))
	case constant.ToolReadEmailByID:
		return s.googleApiSvc.ReadEmailByID(ctx, uint32(c.Args["id"].(float64)))
	case constant.ToolLiveRainSummary:
		return s.googleApiSvc.GetRainSummary(ctx, orgID, aRain)
	case constant.ToolLiveWaterSummary:
		return s.googleApiSvc.GetWaterSummary(ctx, orgID, append(aLake, aRiver...))
	case constant.ToolSystemOverview:
		if orgID == "" {
			return s.stationDataSvc.GetSystemOverview(ctx)
		}
		r, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, aRain)
		l, _ := s.stationSvc.ListLakeStationsFiltered(ctx, orgID, aLake)
		rv, _ := s.stationSvc.ListRiverStationsFiltered(ctx, orgID, aRiver)
		return &weatherSystemOverview{TotalStations: len(r) + len(l) + len(rv), Breakdown: []weatherStationSummary{{Type: "Rain", Count: len(r)}, {Type: "Lake", Count: len(l)}, {Type: "River", Count: len(rv)}}}, nil
	case constant.ToolListStations:
		return s.handleLS(ctx, c, orgID, aRain, aLake, aRiver)
	case constant.ToolRainAnalytics:
		return s.handleRA(ctx, c, orgID, aRain)
	case constant.ToolCoveredWards:
		return s.handleCW(ctx, orgID, aRain)
	case constant.ToolWeatherForecast:
		return s.weatherSvc.GetForecast(ctx)
	case constant.ToolRainSummaryByWard:
		return s.stationDataSvc.GetRainSummaryByWard(ctx, int(c.Args["year"].(float64)), int(c.Args["month"].(float64)), c.Args["start_date"].(string), c.Args["end_date"].(string))
	case constant.ToolLiveInundationSummary:
		r := isC
		if u != nil {
			r = r || u.Role == "Super Admin" || u.Role == "Manager"
		}
		var summary *inundation.InundationSummaryData
		var err error
		if dateVal, ok := c.Args["date"].(string); ok && dateVal != "" {
			summary, err = s.inuSvc.GetInundationSummaryByDate(ctx, orgID, r, aInu, dateVal)
		} else {
			summary, err = s.inuSvc.GetInundationSummary(ctx, orgID, r, aInu)
		}
		if err != nil {
			return nil, err
		}
		if orgNameVal, ok := c.Args["org_name"].(string); ok && orgNameVal != "" {
			orgNameValLower := strings.ToLower(orgNameVal)
			var filtered []inundation.InundationStationStat
			var filteredDetails []string
			for _, pt := range summary.OngoingPoints {
				ptOrgLower := strings.ToLower(pt.OrgName)
				if matchesOrg(ptOrgLower, orgNameValLower) {
					filtered = append(filtered, pt)
					filteredDetails = append(filteredDetails, fmt.Sprintf("%s (%s, %s)", pt.StreetName, pt.FloodLevelName, pt.FormattedDepth))
				}
			}
			summary.OngoingPoints = filtered
			summary.ActivePoints = len(filtered)
			summary.FullSummary = strings.Join(filteredDetails, ", ")
			
			dateStr := "hiện tại"
			if dateVal, ok := c.Args["date"].(string); ok && dateVal != "" {
				dateStr = "ngày " + dateVal
			}
			if len(filtered) > 0 {
				summary.SummaryText = fmt.Sprintf("%s, đơn vị %s có %d điểm úng ngập", dateStr, orgNameVal, len(filtered))
			} else {
				summary.SummaryText = fmt.Sprintf("%s, đơn vị %s không xuất hiện điểm úng ngập", dateStr, orgNameVal)
			}
		}
		return summary, nil
	case constant.ToolLivePumpingSummary:
		var aPump []string
		if u != nil && u.AssignedPumpingStationID != "" {
			aPump = []string{u.AssignedPumpingStationID}
		}
		p, err := s.pumpingSvc.GetPumpingStationSummary(ctx, orgID, aPump)
		var ww interface{}
		if s.wastewaterSvc != nil {
			ww, _ = s.wastewaterSvc.ListFiltered(ctx, orgID, nil)
		}
		return map[string]interface{}{
			"pumping_stations": p,
			"wastewater_stations": ww,
		}, err
	case constant.ToolEmergencyList, constant.ToolEmergencyHistory, constant.ToolUnfinishedEmergencyHistory, constant.ToolRecentEmergencyReports, constant.ToolReportEmergencyProgress:
		return s.handleCT(ctx, c, uID)
	case constant.ToolDatabaseQuery:
		return s.querySvc.Query(ctx, c.Args["collection"].(string), c.Args["filter"].(map[string]interface{}), 0)
	default:
		return nil, fmt.Errorf("unknown tool: %s", c.Name)
	}
}

func (s *service) handleContractToolCall(ctx context.Context, c *genai.FunctionCall) (interface{}, error) {
	switch c.Name {
	case constant.ToolContractSummary:
		return s.contractSvc.GetContractSummary(ctx)
	case constant.ToolExpiringContracts:
		days := 30
		if d, ok := c.Args["days"].(float64); ok && d > 0 {
			days = int(d)
		}
		return s.contractSvc.GetExpiringSoon(ctx, days)
	case constant.ToolExpiredContracts:
		return s.contractSvc.GetExpired(ctx)
	case constant.ToolContractStagesSoon:
		days := 30
		if d, ok := c.Args["days"].(float64); ok && d > 0 {
			days = int(d)
		}
		return s.contractSvc.GetStagesDueSoon(ctx, days)
	case constant.ToolContractStagesPassed:
		return s.contractSvc.GetStagesPassed(ctx)
	case constant.ToolSearchContracts:
		return s.contractSvc.SearchContracts(ctx, c.Args["keyword"].(string))
	default:
		return nil, fmt.Errorf("unknown tool: %s", c.Name)
	}
}

func matchesOrg(target, query string) bool {
	if strings.Contains(target, query) {
		return true
	}
	
	simplify := func(s string) string {
		s = strings.ToLower(s)
		s = strings.ReplaceAll(s, "xí nghiệp", "xn")
		s = strings.ReplaceAll(s, "thoát nước", "")
		s = strings.ReplaceAll(s, "số", "")
		s = strings.ReplaceAll(s, " ", "")
		return s
	}
	
	return strings.Contains(simplify(target), simplify(query)) || strings.Contains(simplify(query), simplify(target))
}
