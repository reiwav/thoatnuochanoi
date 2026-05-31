package gemini

import (
	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/service/station/inundation"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
	"go.mongodb.org/mongo-driver/bson"
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
		{Name: "get_inundation_history_by_range", Description: "Xem lịch sử thống kê ngập úng trong một khoảng thời gian (từ ngày đến ngày). Kết quả được gộp nhóm theo vị trí điểm ngập và hỗ trợ lọc theo xí nghiệp quản lý.",
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{
				"start_date": {Type: genai.TypeString, Description: "Định dạng YYYY-MM-DD. Bắt buộc, ngày bắt đầu khoảng thời gian cần tra cứu."},
				"end_date":   {Type: genai.TypeString, Description: "Định dạng YYYY-MM-DD. Bắt buộc, ngày kết thúc khoảng thời gian cần tra cứu."},
				"org_name":   {Type: genai.TypeString, Description: "Tên xí nghiệp/đơn vị quản lý (ví dụ: 'Xí nghiệp 1'). Tùy chọn, dùng để lọc kết quả."},
			}, Required: []string{"start_date", "end_date"}}},
		{Name: constant.ToolLivePumpingSummary, Description: constant.ToolDescriptions[constant.ToolLivePumpingSummary]},
		{Name: constant.ToolRainSummaryByWard, Description: constant.ToolDescriptions[constant.ToolRainSummaryByWard],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"year": {Type: genai.TypeInteger}, "month": {Type: genai.TypeInteger}, "start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}}}},
		{Name: constant.ToolDatabaseQuery, Description: constant.ToolDescriptions[constant.ToolDatabaseQuery],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"collection": {Type: genai.TypeString}, "filter": {Type: genai.TypeObject}}, Required: []string{"collection"}}},
		{Name: constant.ToolDatabaseAggregate, Description: "Thực hiện truy vấn tổng hợp MongoDB (Aggregation Pipeline) để đếm, cộng, nhóm số liệu. Dùng cho các câu hỏi thống kê lịch sử/phức tạp.",
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{
				"collection": {Type: genai.TypeString, Description: "Tên bộ sưu tập cần truy vấn tổng hợp (inundation_reports, rain_records, v.v.)."},
				"pipeline": {Type: genai.TypeArray, Items: &genai.Schema{Type: genai.TypeObject}, Description: "Mảng các bước pipeline MongoDB (ví dụ: [ { '$match': ... }, { '$group': ... } ])."},
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
	case "get_inundation_history_by_range":
		startDateVal, _ := c.Args["start_date"].(string)
		endDateVal, _ := c.Args["end_date"].(string)
		orgNameVal, _ := c.Args["org_name"].(string)
		return s.handleInundationHistoryByRange(ctx, startDateVal, endDateVal, orgNameVal)
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
		collectionVal := c.Args["collection"].(string)
		filterVal, _ := c.Args["filter"].(map[string]interface{})
		log.Printf("[ToolDatabaseQuery] collection=%s, filter=%+v", collectionVal, filterVal)
		if collectionVal == "rain_records" {
			s.ensureRainDataLoaded(ctx, filterVal)
		}
		res, err := s.querySvc.Query(ctx, collectionVal, filterVal, 0)
		if err == nil {
			formatTimestampsInResult(res)
		}
		return res, err
	case constant.ToolDatabaseAggregate:
		collectionVal := c.Args["collection"].(string)
		log.Printf("[ToolDatabaseAggregate] collection=%s, pipeline=%+v", collectionVal, c.Args["pipeline"])
		
		pipelineBytes, err := json.Marshal(c.Args["pipeline"])
		if err != nil {
			return nil, fmt.Errorf("lỗi khi mã hóa pipeline: %w", err)
		}
		
		var pipeline []bson.M
		if err := bson.UnmarshalExtJSON(pipelineBytes, true, &pipeline); err != nil {
			if err := json.Unmarshal(pipelineBytes, &pipeline); err != nil {
				return nil, fmt.Errorf("lỗi khi giải mã pipeline: %w", err)
			}
		}
		
		if collectionVal == "rain_records" {
			s.ensureRainDataLoaded(ctx, pipeline)
		}
		
		if collectionVal == "inundation_reports" {
			hasMatch := false
			for i, stage := range pipeline {
				if match, ok := stage["$match"].(bson.M); ok {
					match["has_flooded"] = true
					pipeline[i]["$match"] = match
					hasMatch = true
					break
				}
			}
			if !hasMatch {
				pipeline = append([]bson.M{{"$match": bson.M{"has_flooded": true}}}, pipeline...)
			}
		}
		
		res, err := s.querySvc.Aggregate(ctx, collectionVal, pipeline)
		if err == nil {
			formatTimestampsInResult(res)
		}
		return res, err
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

func extractDates(v interface{}) []string {
	var dates []string
	seen := make(map[string]bool)
	var walk func(x interface{})
	walk = func(x interface{}) {
		if x == nil {
			return
		}
		switch val := x.(type) {
		case string:
			if len(val) >= 10 {
				for i := 0; i <= len(val)-10; i++ {
					sub := val[i : i+10]
					if sub[4] == '-' && sub[7] == '-' {
						isDate := true
						for j := 0; j < 10; j++ {
							if j == 4 || j == 7 {
								continue
							}
							if sub[j] < '0' || sub[j] > '9' {
								isDate = false
								break
							}
						}
						if isDate {
							if !seen[sub] {
								seen[sub] = true
								dates = append(dates, sub)
							}
						}
					}
				}
			}
		case map[string]interface{}:
			for _, item := range val {
				walk(item)
			}
		case []interface{}:
			for _, item := range val {
				walk(item)
			}
		case bson.M:
			for _, item := range val {
				walk(item)
			}
		case []bson.M:
			for _, item := range val {
				walk(item)
			}
		case bson.D:
			for _, elem := range val {
				walk(elem.Value)
			}
		case []bson.D:
			for _, item := range val {
				walk(item)
			}
		}
	}
	walk(v)
	return dates
}

func (s *service) ensureRainDataLoaded(ctx context.Context, filterOrPipeline interface{}) {
	dates := extractDates(filterOrPipeline)
	for _, date := range dates {
		log.Printf("[ensureRainDataLoaded] pre-fetching rain records for date %s", date)
		_, err := s.rainSvc.GetRainDataByDate(ctx, date)
		if err != nil {
			log.Printf("[ensureRainDataLoaded] error pre-fetching rain records for date %s: %v", date, err)
		}
	}
}

func isTimestampKey(key string) bool {
	k := strings.ToLower(key)
	keywords := []string{
		"time", "date", "created", "updated", "start", "end",
		"ngay", "ngày", "gio", "giờ", "thoi", "thời", "timestamp",
		"lúc", "luc", "hạn", "han", "phút", "phut", "giây", "giay",
	}
	for _, kw := range keywords {
		if strings.Contains(k, kw) {
			return true
		}
	}
	// Special case for "at" as a word or suffix
	if k == "at" || strings.HasSuffix(k, "_at") || strings.HasSuffix(k, " at") || strings.Contains(k, " at ") || strings.HasPrefix(k, "at_") || strings.HasPrefix(k, "at ") {
		return true
	}
	return false
}

func formatTimestampsInResult(res interface{}) {
	var walk func(interface{})
	walk = func(node interface{}) {
		if node == nil {
			return
		}
		switch val := node.(type) {
		case map[string]interface{}:
			for k, v := range val {
				if isTimestampKey(k) {
					val[k] = formatUnixTimestamp(v)
				} else {
					walk(v)
				}
			}
		case []interface{}:
			for _, item := range val {
				walk(item)
			}
		case []map[string]interface{}:
			for _, item := range val {
				walk(item)
			}
		}
	}
	walk(res)
}

func formatUnixTimestamp(val interface{}) interface{} {
	var timestamp int64
	switch v := val.(type) {
	case int64:
		timestamp = v
	case int:
		timestamp = int64(v)
	case int32:
		timestamp = int64(v)
	case float64:
		timestamp = int64(v)
	default:
		return val
	}
	if timestamp <= 0 {
		return "-"
	}
	// Check if it looks like a reasonable unix timestamp (e.g. year 2020 to 2035)
	if timestamp >= 1577836800 && timestamp <= 2051222400 {
		loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
		if err != nil {
			loc = time.FixedZone("GMT+7", 7*60*60)
		}
		return time.Unix(timestamp, 0).In(loc).Format("02-01-2006 15:04:05")
	}
	return val
}

func isSliceOfInundationReports(res []map[string]interface{}) bool {
	if len(res) == 0 {
		return false
	}
	doc := res[0]
	_, hasStreet := doc["street_name"]
	_, hasCreatedAt := doc["created_at"]
	_, hasPointID := doc["point_id"]
	_, hasStatus := doc["status"]
	
	_, hasStreetTitle := doc["Street name"]
	_, hasCreatedAtTitle := doc["Created at"]
	_, hasStatusTitle := doc["Trạng thái"]

	return hasStreet || hasCreatedAt || hasPointID || hasStatus || hasStreetTitle || hasCreatedAtTitle || hasStatusTitle
}

func (s *service) formatInundationReportsForFrontend(ctx context.Context, res []map[string]interface{}) []map[string]interface{} {
	orgMap := make(map[string]string)
	if orgs, err := s.querySvc.Query(ctx, "organizations", nil, 0); err == nil {
		for _, org := range orgs {
			id, _ := org["_id"].(string)
			name, _ := org["name"].(string)
			if id != "" && name != "" {
				orgMap[id] = name
			}
		}
	}

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	if loc == nil {
		loc = time.FixedZone("GMT+7", 7*60*60)
	}

	// Group reports by point_id or street_name (if point_id is missing/empty)
	type groupInfo struct {
		pointID        string
		streetName     string
		orgID          string
		color          string
		levelName      string
		maxDepth       float64
		reports        []map[string]interface{}
		mostRecentTime int64
		hasActive      bool
	}

	groups := make([]*groupInfo, 0)
	groupMap := make(map[string]*groupInfo)

	for _, doc := range res {
		pointID, _ := doc["point_id"].(string)
		if pointID == "" {
			pointID, _ = doc["Point id"].(string)
		}
		streetName, _ := doc["street_name"].(string)
		if streetName == "" {
			streetName, _ = doc["Street name"].(string)
		}
		orgID, _ := doc["org_id"].(string)
		if orgID == "" {
			orgID, _ = doc["Org id"].(string)
		}

		key := pointID
		if key == "" {
			key = streetName
		}

		g, ok := groupMap[key]
		if !ok {
			g = &groupInfo{
				pointID:    pointID,
				streetName: streetName,
				orgID:      orgID,
				reports:    make([]map[string]interface{}, 0),
			}
			groupMap[key] = g
			groups = append(groups, g)
		}

		g.reports = append(g.reports, doc)

		var depth float64
		if val, ok := doc["depth"]; ok {
			depth = getFloat64Value(val)
		}
		if depth > g.maxDepth {
			g.maxDepth = depth
		}

		color, _ := doc["flood_level_color"].(string)
		if color != "" {
			g.color = color
		}
		levelName, _ := doc["flood_level_name"].(string)
		if levelName != "" {
			g.levelName = levelName
		}

		status, _ := doc["status"].(string)
		if status == "" {
			status, _ = doc["Trạng thái"].(string)
		}
		if status == "active" {
			g.hasActive = true
		}

		var cTime int64
		if val, ok := doc["created_at"]; ok {
			cTime = getInt64Value(val)
		} else if val, ok := doc["Created at"]; ok {
			cTime = getInt64Value(val)
		}
		if cTime > g.mostRecentTime {
			g.mostRecentTime = cTime
		}
	}

	formattedList := make([]map[string]interface{}, 0)

	for _, g := range groups {
		doc := make(map[string]interface{})
		doc["point_id"] = g.pointID
		doc["street_name"] = g.streetName

		orgName := orgMap[g.orgID]
		if orgName == "" {
			orgName = g.orgID
		}
		doc["org_name"] = orgName

		if g.mostRecentTime > 0 {
			doc["start_time"] = time.Unix(g.mostRecentTime, 0).In(loc).Format("15:04 02/01/2006")
		}

		count := len(g.reports)
		doc["count"] = count
		statusText := ""
		if g.hasActive {
			statusText = fmt.Sprintf("Đang ngập (%d lần)", count)
		} else {
			statusText = fmt.Sprintf("Đã rút (%d lần)", count)
		}
		doc["current_status"] = statusText
		doc["duration"] = fmt.Sprintf("%d lần", count)

		depthInfo := ""
		if g.maxDepth > 0 {
			depthInfo = fmt.Sprintf("Max: %.2fm", g.maxDepth)
		} else {
			depthInfo = "chưa rõ độ sâu"
		}
		doc["formatted_depth"] = depthInfo

		if g.color != "" {
			doc["color"] = g.color
		}

		formattedList = append(formattedList, doc)
	}

	return formattedList
}

func getInt64Value(val interface{}) int64 {
	switch v := val.(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case int32:
		return int64(v)
	case float64:
		return int64(v)
	}
	return 0
}

func getFloat64Value(val interface{}) float64 {
	switch v := val.(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int64:
		return float64(v)
	case int:
		return float64(v)
	}
	return 0
}

func formatDuration(cTime, endTime int64) string {
	if cTime <= 0 {
		return ""
	}
	var diff int64
	if endTime > 0 {
		diff = endTime - cTime
	} else {
		diff = time.Now().Unix() - cTime
	}
	if diff < 0 {
		diff = 0
	}

	hours := diff / 3600
	minutes := (diff % 3600) / 60
	days := hours / 24

	if days > 0 {
		remainingHours := hours % 24
		if remainingHours > 0 {
			return fmt.Sprintf("%d ngày %d giờ", days, remainingHours)
		}
		return fmt.Sprintf("%d ngày", days)
	}

	if hours > 0 {
		if minutes > 0 {
			return fmt.Sprintf("%d giờ %d phút", hours, minutes)
		}
		return fmt.Sprintf("%d giờ", hours)
	}

	if minutes > 0 {
		return fmt.Sprintf("%d phút", minutes)
	}
	return "0 phút"
}

func (s *service) handleInundationHistoryByRange(ctx context.Context, startDateStr, endDateStr, orgNameFilter string) (interface{}, error) {
	tStart, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		return nil, fmt.Errorf("ngày bắt đầu không hợp lệ (định dạng đúng: YYYY-MM-DD)")
	}
	tEnd, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		return nil, fmt.Errorf("ngày kết thúc không hợp lệ (định dạng đúng: YYYY-MM-DD)")
	}

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	if loc == nil {
		loc = time.FixedZone("GMT+7", 7*60*60)
	}

	startOfDay := time.Date(tStart.Year(), tStart.Month(), tStart.Day(), 0, 0, 0, 0, loc).Unix()
	endOfDay := time.Date(tEnd.Year(), tEnd.Month(), tEnd.Day(), 23, 59, 59, 999999999, loc).Unix()

	filterVal := bson.M{
		"has_flooded": true,
		"created_at": bson.M{
			"$gte": startOfDay,
			"$lte": endOfDay,
		},
	}
	
	reports, err := s.querySvc.Query(ctx, "inundation_reports", filterVal, 0)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn CSDL: %w", err)
	}

	orgMap := make(map[string]string)
	if orgs, err := s.querySvc.Query(ctx, "organizations", nil, 0); err == nil {
		for _, org := range orgs {
			id, _ := org["_id"].(string)
			name, _ := org["name"].(string)
			if id != "" && name != "" {
				orgMap[id] = name
			}
		}
	}

	type groupInfo struct {
		pointID        string
		streetName     string
		orgID          string
		color          string
		levelName      string
		maxDepth       float64
		reports        []map[string]interface{}
		mostRecentTime int64
		hasActive      bool
	}

	groups := make([]*groupInfo, 0)
	groupMap := make(map[string]*groupInfo)

	for _, doc := range reports {
		pointID, _ := doc["point_id"].(string)
		streetName, _ := doc["street_name"].(string)
		orgID, _ := doc["org_id"].(string)

		key := pointID
		if key == "" {
			key = streetName
		}

		g, ok := groupMap[key]
		if !ok {
			g = &groupInfo{
				pointID:    pointID,
				streetName: streetName,
				orgID:      orgID,
				reports:    make([]map[string]interface{}, 0),
			}
			groupMap[key] = g
			groups = append(groups, g)
		}

		g.reports = append(g.reports, doc)

		var depth float64
		if val, ok := doc["depth"]; ok {
			depth = getFloat64Value(val)
		}
		if depth > g.maxDepth {
			g.maxDepth = depth
		}

		color, _ := doc["flood_level_color"].(string)
		if color != "" {
			g.color = color
		}
		levelName, _ := doc["flood_level_name"].(string)
		if levelName != "" {
			g.levelName = levelName
		}

		status, _ := doc["status"].(string)
		if status == "active" {
			g.hasActive = true
		}

		var cTime int64
		if val, ok := doc["created_at"]; ok {
			cTime = getInt64Value(val)
		}
		if cTime > g.mostRecentTime {
			g.mostRecentTime = cTime
		}
	}

	formattedList := make([]map[string]interface{}, 0)
	orgNameFilterLower := strings.ToLower(orgNameFilter)

	for _, g := range groups {
		orgName := orgMap[g.orgID]
		if orgName == "" {
			orgName = g.orgID
		}

		if orgNameFilterLower != "" && !matchesOrg(strings.ToLower(orgName), orgNameFilterLower) {
			continue
		}

		doc := make(map[string]interface{})
		doc["point_id"] = g.pointID
		doc["street_name"] = g.streetName
		doc["org_name"] = orgName

		if g.mostRecentTime > 0 {
			doc["start_time"] = time.Unix(g.mostRecentTime, 0).In(loc).Format("15:04 02/01/2006")
		}

		count := len(g.reports)
		doc["count"] = count
		doc["query_start_date"] = startDateStr
		doc["query_end_date"] = endDateStr

		statusText := ""
		if g.hasActive {
			statusText = fmt.Sprintf("Đang ngập (%d lần)", count)
		} else {
			statusText = fmt.Sprintf("Đã rút (%d lần)", count)
		}
		doc["current_status"] = statusText
		doc["duration"] = fmt.Sprintf("%d lần", count)

		depthInfo := ""
		if g.maxDepth > 0 {
			depthInfo = fmt.Sprintf("Max: %.2fm", g.maxDepth)
		} else {
			depthInfo = "chưa rõ độ sâu"
		}
		doc["formatted_depth"] = depthInfo

		if g.color != "" {
			doc["color"] = g.color
		}

		formattedList = append(formattedList, doc)
	}

	return formattedList, nil
}
