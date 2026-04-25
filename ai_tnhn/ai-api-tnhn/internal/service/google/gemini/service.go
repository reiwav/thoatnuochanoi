package gemini

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/contract"
	"ai-api-tnhn/internal/service/emergency_construction"
	"ai-api-tnhn/internal/service/google/gemini/promt"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/internal/service/inundation"
	pumpingstation "ai-api-tnhn/internal/service/pumping_station"
	"ai-api-tnhn/internal/service/query"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/stationdata"
	"ai-api-tnhn/internal/service/water"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/generative-ai-go/genai"
	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/sync/errgroup"
	"google.golang.org/api/option"
)

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
)

var toolDescriptions = map[string]string{
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

type Service interface {
	Chat(ctx context.Context, prompt string, history []googleapi.ChatMessage, userID string, isCompany bool, logPrompt string) (string, error)
	ChatContract(ctx context.Context, prompt string, history []googleapi.ChatMessage, userID string, isCompany bool, logPrompt string) (string, error)
	ExtractTextFromPDF(ctx context.Context, pdfBytes []byte) (string, error)
}

type service struct {
	clients               []*genai.Client
	contractClients       []*genai.Client
	mu                    sync.Mutex
	roundRobinIdx         int
	contractRoundRobinIdx int
	waterSvc              water.Service
	googleApiSvc          googleapi.Service
	inuSvc                inundation.Service
	querySvc              query.Service
	stationDataSvc        stationdata.Service
	emcSvc                emergency_construction.Service
	contractSvc           contract.Service
	stationSvc            station.Service
	pumpingSvc            pumpingstation.Service
	aiUsageRepo           repository.AiUsage
	aiChatLogRepo         repository.AiChatLog
	userRepo              repository.User
}

func NewService(k, kc string, w water.Service, g googleapi.Service, i inundation.Service, q query.Service, sd stationdata.Service, e emergency_construction.Service, c contract.Service, s station.Service, p pumpingstation.Service, ar repository.AiUsage, al repository.AiChatLog, ur repository.User) (Service, error) {
	if k == "" {
		return nil, fmt.Errorf("gemini api key is required")
	}
	ctx := context.Background()
	var cl, ccl []*genai.Client
	for _, key := range strings.Split(k, ",") {
		if key = strings.TrimSpace(key); key != "" {
			if client, err := genai.NewClient(ctx, option.WithAPIKey(key)); err == nil {
				cl = append(cl, client)
			}
		}
	}
	if kc == "" {
		ccl = cl
	} else {
		for _, key := range strings.Split(kc, ",") {
			if key = strings.TrimSpace(key); key != "" {
				if client, err := genai.NewClient(ctx, option.WithAPIKey(key)); err == nil {
					ccl = append(ccl, client)
				}
			}
		}
	}
	if len(cl) == 0 {
		return nil, fmt.Errorf("failed to create any valid gemini client")
	}
	return &service{clients: cl, contractClients: ccl, waterSvc: w, googleApiSvc: g, inuSvc: i, querySvc: q, stationDataSvc: sd, emcSvc: e, contractSvc: c, stationSvc: s, pumpingSvc: p, aiUsageRepo: ar, aiChatLogRepo: al, userRepo: ur}, nil
}

func (s *service) getClient() *genai.Client {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.clients[s.roundRobinIdx]
	s.roundRobinIdx = (s.roundRobinIdx + 1) % len(s.clients)
	return c
}
func (s *service) getContractClient() *genai.Client {
	s.mu.Lock()
	defer s.mu.Unlock()
	c := s.contractClients[s.contractRoundRobinIdx]
	s.contractRoundRobinIdx = (s.contractRoundRobinIdx + 1) % len(s.contractClients)
	return c
}

func (s *service) Chat(ctx context.Context, prompt string, history []googleapi.ChatMessage, userID string, isCompany bool, logPrompt string) (string, error) {
	raw, aug := prompt, prompt
	if strings.Contains(strings.ToLower(prompt), "mưa") && (strings.Contains(strings.ToLower(prompt), "3 ngày trước") || strings.Contains(strings.ToLower(prompt), "ba ngày trước")) {
		dStr := time.Now().AddDate(0, 0, -3).Format("2006-01-02")
		if data, err := s.waterSvc.GetRainDataByDate(ctx, dStr); err == nil {
			dj, _ := json.Marshal(data)
			aug = fmt.Sprintf("[Hệ thống context]: Lượng mưa thực tế %s: %s\n\n[Câu hỏi]: %s", dStr, string(dj), prompt)
		}
	} else {
		aug = fmt.Sprintf("[Hệ thống]: %s\n\n[Câu hỏi]: %s", time.Now().Format("2006-01-02 15:04:05"), prompt)
	}

	cl := s.getClient()
	m := cl.GenerativeModel("gemini-2.5-flash")
	m.SystemInstruction = &genai.Content{Parts: []genai.Part{genai.Text(promt.Get("chat_system"))}}
	m.Tools = []*genai.Tool{{FunctionDeclarations: s.getChatTools()}}
	sess := m.StartChat()
	resp, err := sess.SendMessage(ctx, genai.Text(aug))
	if err != nil {
		return "", err
	}
	s.recordUsage(ctx, resp.UsageMetadata)

	for {
		if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
			break
		}
		var calls []*genai.FunctionCall
		for _, p := range resp.Candidates[0].Content.Parts {
			if c, ok := p.(genai.FunctionCall); ok {
				calls = append(calls, &c)
			}
		}
		if len(calls) == 0 {
			break
		}
		var trs []genai.Part
		var mu sync.Mutex
		g, gCtx := errgroup.WithContext(ctx)
		for _, c := range calls {
			c := c
			g.Go(func() error {
				res, te := s.handleToolCall(gCtx, c, userID, isCompany)
				mu.Lock()
				defer mu.Unlock()
				if te != nil {
					trs = append(trs, genai.FunctionResponse{Name: c.Name, Response: map[string]interface{}{"error": te.Error()}})
				} else {
					jb, _ := json.Marshal(res)
					rs := string(jb)
					if len(rs) > 30000 {
						rs = rs[:30000] + "... (truncated)"
					}
					trs = append(trs, genai.FunctionResponse{Name: c.Name, Response: map[string]interface{}{"result": rs}})
				}
				return nil
			})
		}
		_ = g.Wait()
		resp, err = sess.SendMessage(ctx, trs...)
		if err != nil {
			return "", err
		}
		s.recordUsage(ctx, resp.UsageMetadata)
	}
	fr := ""
	for _, p := range resp.Candidates[0].Content.Parts {
		fr += fmt.Sprintf("%v", p)
	}
	go s.saveLog(userID, raw, fr, logPrompt, "support")
	return fr, nil
}

func (s *service) ChatContract(ctx context.Context, prompt string, history []googleapi.ChatMessage, userID string, isCompany bool, logPrompt string) (string, error) {
	raw := prompt
	cl := s.getContractClient()
	m := cl.GenerativeModel("gemini-2.5-flash")
	m.SystemInstruction = &genai.Content{Parts: []genai.Part{genai.Text(promt.Get("contract_system"))}}
	m.Tools = []*genai.Tool{{FunctionDeclarations: s.getContractTools()}}
	aug := fmt.Sprintf("[Hệ thống]: %s\n\n[Câu hỏi]: %s", time.Now().Format("2006-01-02 15:04:05"), prompt)
	sess := m.StartChat()
	resp, err := sess.SendMessage(ctx, genai.Text(aug))
	if err != nil {
		return "", err
	}
	s.recordUsage(ctx, resp.UsageMetadata)

	for {
		if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
			break
		}
		var calls []*genai.FunctionCall
		for _, p := range resp.Candidates[0].Content.Parts {
			if c, ok := p.(genai.FunctionCall); ok {
				calls = append(calls, &c)
			}
		}
		if len(calls) == 0 {
			break
		}
		var trs []genai.Part
		var mu sync.Mutex
		g, gCtx := errgroup.WithContext(ctx)
		for _, c := range calls {
			c := c
			g.Go(func() error {
				var res interface{}
				var te error
				switch c.Name {
				case ToolContractSummary:
					res, te = s.contractSvc.GetContractSummary(gCtx)
				case ToolExpiringContracts:
					days := 30
					if d, ok := c.Args["days"].(float64); ok && d > 0 {
						days = int(d)
					}
					res, te = s.contractSvc.GetExpiringSoon(gCtx, days)
				case ToolExpiredContracts:
					res, te = s.contractSvc.GetExpired(gCtx)
				case ToolContractStagesSoon:
					days := 30
					if d, ok := c.Args["days"].(float64); ok && d > 0 {
						days = int(d)
					}
					res, te = s.contractSvc.GetStagesDueSoon(gCtx, days)
				case ToolContractStagesPassed:
					res, te = s.contractSvc.GetStagesPassed(gCtx)
				case ToolSearchContracts:
					res, te = s.contractSvc.SearchContracts(gCtx, c.Args["keyword"].(string))
				default:
					te = fmt.Errorf("unknown tool: %s", c.Name)
				}
				mu.Lock()
				defer mu.Unlock()
				if te != nil {
					trs = append(trs, genai.FunctionResponse{Name: c.Name, Response: map[string]interface{}{"error": te.Error()}})
				} else {
					jb, _ := json.Marshal(res)
					rs := string(jb)
					if len(rs) > 30000 {
						rs = rs[:30000] + "... (truncated)"
					}
					trs = append(trs, genai.FunctionResponse{Name: c.Name, Response: map[string]interface{}{"result": rs}})
				}
				return nil
			})
		}
		_ = g.Wait()
		resp, err = sess.SendMessage(ctx, trs...)
		if err != nil {
			return "", err
		}
		s.recordUsage(ctx, resp.UsageMetadata)
	}
	fr := ""
	for _, p := range resp.Candidates[0].Content.Parts {
		fr += fmt.Sprintf("%v", p)
	}
	go s.saveLog(userID, raw, fr, logPrompt, "contract")
	return fr, nil
}

func (s *service) ExtractTextFromPDF(ctx context.Context, b []byte) (string, error) {
	cl := s.getClient()
	m := cl.GenerativeModel("gemini-2.5-flash")
	resp, err := m.GenerateContent(ctx, genai.Blob{MIMEType: "application/pdf", Data: b}, genai.Text(promt.Get("pdf_extraction")))
	if err != nil {
		return "", err
	}
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content generated")
	}
	res := ""
	for _, p := range resp.Candidates[0].Content.Parts {
		res += fmt.Sprintf("%v", p)
	}
	return res, nil
}

func (s *service) recordUsage(ctx context.Context, u *genai.UsageMetadata) {
	if u == nil {
		return
	}
	go func() {
		_ = s.aiUsageRepo.Save(context.Background(), &models.AiUsage{ModelName: "gemini-2.5-flash", PromptTokens: int(u.PromptTokenCount), CandidateTokens: int(u.CandidatesTokenCount), TotalTokens: int(u.TotalTokenCount), Timestamp: time.Now()})
	}()
}

func (s *service) saveLog(uID, raw, res, lp, cT string) {
	if s.aiChatLogRepo == nil || lp == "SKIP_LOG" {
		return
	}
	c := raw
	if lp != "" {
		c = lp
	}
	now := time.Now()
	ctx := context.Background()
	_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{UserID: uID, Role: "user", Content: c, ChatType: cT, Timestamp: now.Add(-1 * time.Second)})
	_ = s.aiChatLogRepo.Save(ctx, &models.AiChatLog{UserID: uID, Role: "model", Content: res, ChatType: cT, Timestamp: now})
}

func (s *service) getChatTools() []*genai.FunctionDeclaration {
	return []*genai.FunctionDeclaration{
		{Name: ToolGoogleStatus, Description: toolDescriptions[ToolGoogleStatus]},
		{Name: ToolLiveRainSummary, Description: toolDescriptions[ToolLiveRainSummary]},
		{Name: ToolRainDataByDate, Description: toolDescriptions[ToolRainDataByDate],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"date": {Type: genai.TypeString, Description: "YYYY-MM-DD"}}, Required: []string{"date"}}},
		{Name: ToolLakeDataByDate, Description: toolDescriptions[ToolLakeDataByDate],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"date": {Type: genai.TypeString, Description: "YYYY-MM-DD"}}, Required: []string{"date"}}},
		{Name: ToolRiverDataByDate, Description: toolDescriptions[ToolRiverDataByDate],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"date": {Type: genai.TypeString, Description: "YYYY-MM-DD"}}, Required: []string{"date"}}},
		{Name: ToolSystemOverview, Description: toolDescriptions[ToolSystemOverview]},
		{Name: ToolListStations, Description: toolDescriptions[ToolListStations],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"type": {Type: genai.TypeString, Description: "rain/lake/river"}}, Required: []string{"type"}}},
		{Name: ToolRainAnalytics, Description: toolDescriptions[ToolRainAnalytics],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"station_id": {Type: genai.TypeInteger}, "year": {Type: genai.TypeInteger}, "month": {Type: genai.TypeInteger}, "start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}, "group_by": {Type: genai.TypeString}}}},
		{Name: ToolCoveredWards, Description: toolDescriptions[ToolCoveredWards]},
		{Name: ToolLiveWaterSummary, Description: toolDescriptions[ToolLiveWaterSummary]},
		{Name: ToolLiveInundationSummary, Description: toolDescriptions[ToolLiveInundationSummary]},
		{Name: ToolLivePumpingSummary, Description: toolDescriptions[ToolLivePumpingSummary]},
		{Name: ToolRainSummaryByWard, Description: toolDescriptions[ToolRainSummaryByWard],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"year": {Type: genai.TypeInteger}, "month": {Type: genai.TypeInteger}, "start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}}}},
		{Name: ToolDatabaseQuery, Description: toolDescriptions[ToolDatabaseQuery],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"collection": {Type: genai.TypeString}, "filter": {Type: genai.TypeObject}}, Required: []string{"collection"}}},
		{Name: ToolReadEmailByTitle, Description: toolDescriptions[ToolReadEmailByTitle],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"title": {Type: genai.TypeString}}, Required: []string{"title"}}},
		{Name: ToolReadEmailByID, Description: toolDescriptions[ToolReadEmailByID],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"id": {Type: genai.TypeInteger}}, Required: []string{"id"}}},
		{Name: ToolReportEmergencyProgress, Description: toolDescriptions[ToolReportEmergencyProgress],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"construction_id": {Type: genai.TypeString}, "work_done": {Type: genai.TypeString}, "progress_percentage": {Type: genai.TypeInteger}, "issues": {Type: genai.TypeString}, "is_completed": {Type: genai.TypeBoolean}, "expected_completion_date": {Type: genai.TypeString}}, Required: []string{"construction_id", "work_done"}}},
		{Name: ToolEmergencyHistory, Description: toolDescriptions[ToolEmergencyHistory],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"construction_id": {Type: genai.TypeString}}, Required: []string{"construction_id"}}},
		{Name: ToolEmergencyList, Description: toolDescriptions[ToolEmergencyList]},
		{Name: ToolRecentEmergencyReports, Description: toolDescriptions[ToolRecentEmergencyReports],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}}}},
		{Name: ToolUnfinishedEmergencyHistory, Description: toolDescriptions[ToolUnfinishedEmergencyHistory]},
	}
}

func (s *service) getContractTools() []*genai.FunctionDeclaration {
	return []*genai.FunctionDeclaration{
		{Name: ToolContractSummary, Description: toolDescriptions[ToolContractSummary]},
		{Name: ToolExpiringContracts, Description: toolDescriptions[ToolExpiringContracts], Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"days": {Type: genai.TypeInteger}}}},
		{Name: ToolExpiredContracts, Description: toolDescriptions[ToolExpiredContracts]},
		{Name: ToolContractStagesSoon, Description: toolDescriptions[ToolContractStagesSoon], Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"days": {Type: genai.TypeInteger}}}},
		{Name: ToolContractStagesPassed, Description: toolDescriptions[ToolContractStagesPassed]},
		{Name: ToolSearchContracts, Description: toolDescriptions[ToolSearchContracts], Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"keyword": {Type: genai.TypeString}}, Required: []string{"keyword"}}},
	}
}

func (s *service) handleToolCall(ctx context.Context, c *genai.FunctionCall, uID string, isC bool) (interface{}, error) {
	u, _ := s.userRepo.GetByID(ctx, uID)
	orgID := ""
	var aRain, aLake, aRiver, aInu, aPump []string
	if u != nil {
		orgID = u.OrgID
		if isC {
			orgID = ""
		}
		aRain, aLake, aRiver, aInu = u.AssignedRainStationIDs, u.AssignedLakeStationIDs, u.AssignedRiverStationIDs, u.AssignedInundationStationIDs
		if u.AssignedPumpingStationID != "" {
			aPump = []string{u.AssignedPumpingStationID}
		}
	}
	switch c.Name {
	case ToolGoogleStatus:
		return s.googleApiSvc.GetStatus(ctx)
	case ToolReadEmailByTitle:
		return s.googleApiSvc.ReadEmailByTitle(ctx, c.Args["title"].(string))
	case ToolReadEmailByID:
		return s.googleApiSvc.ReadEmailByID(ctx, uint32(c.Args["id"].(float64)))
	case ToolLiveRainSummary:
		return s.googleApiSvc.GetRainSummary(ctx, orgID, aRain)
	case ToolLiveWaterSummary:
		return s.googleApiSvc.GetWaterSummary(ctx, orgID, append(aLake, aRiver...))
	case ToolRainDataByDate:
		return s.handleDR(ctx, c, orgID, aRain)
	case ToolSystemOverview:
		if orgID == "" {
			return s.stationDataSvc.GetSystemOverview(ctx)
		}
		r, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, aRain)
		l, _ := s.stationSvc.ListLakeStationsFiltered(ctx, orgID, aLake)
		rv, _ := s.stationSvc.ListRiverStationsFiltered(ctx, orgID, aRiver)
		return &weatherSystemOverview{TotalStations: len(r) + len(l) + len(rv), Breakdown: []weatherStationSummary{{Type: "Rain", Count: len(r)}, {Type: "Lake", Count: len(l)}, {Type: "River", Count: len(rv)}}}, nil
	case ToolListStations:
		return s.handleLS(ctx, c, orgID, aRain, aLake, aRiver)
	case ToolRainAnalytics:
		return s.handleRA(ctx, c, orgID, aRain)
	case ToolCoveredWards:
		return s.handleCW(ctx, orgID, aRain)
	case ToolRainSummaryByWard:
		return s.stationDataSvc.GetRainSummaryByWard(ctx, int(c.Args["year"].(float64)), int(c.Args["month"].(float64)), c.Args["start_date"].(string), c.Args["end_date"].(string))
	case ToolLiveInundationSummary:
		r := isC
		if u != nil {
			r = r || u.Role == "Super Admin" || u.Role == "Manager"
		}
		return s.inuSvc.GetInundationSummary(ctx, orgID, r, aInu)
	case ToolLivePumpingSummary:
		return s.pumpingSvc.GetPumpingStationSummary(ctx, orgID, aPump)
	case ToolEmergencyList, ToolEmergencyHistory, ToolUnfinishedEmergencyHistory, ToolRecentEmergencyReports, ToolReportEmergencyProgress:
		return s.handleCT(ctx, c, uID)
	case ToolDatabaseQuery:
		return s.querySvc.Query(ctx, c.Args["collection"].(string), c.Args["filter"].(map[string]interface{}), 0)
	default:
		return nil, fmt.Errorf("unknown tool: %s", c.Name)
	}
}

func (s *service) handleDR(ctx context.Context, c *genai.FunctionCall, orgID string, ids []string) (interface{}, error) {
	d, e := s.waterSvc.GetRainDataByDate(ctx, c.Args["date"].(string))
	if e != nil || orgID == "" {
		return d, e
	}
	al, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, ids)
	am := make(map[int]bool)
	for _, st := range al {
		am[st.OldID] = true
	}
	var res []*models.RainRecord
	for _, r := range d {
		if am[int(r.StationID)] {
			res = append(res, r)
		}
	}
	return res, nil
}
func (s *service) handleLS(ctx context.Context, c *genai.FunctionCall, o string, r, l, rv []string) (interface{}, error) {
	t := c.Args["type"].(string)
	switch t {
	case "rain":
		sts, e := s.stationSvc.ListRainStationsFiltered(ctx, o, r)
		var res []map[string]interface{}
		for _, st := range sts {
			res = append(res, map[string]interface{}{"id": st.ID, "name": st.TenTram, "phuong": st.TenPhuong, "address": st.DiaChi})
		}
		return res, e
	case "lake":
		sts, e := s.stationSvc.ListLakeStationsFiltered(ctx, o, l)
		var res []map[string]interface{}
		for _, st := range sts {
			res = append(res, map[string]interface{}{"id": st.ID, "name": st.TenTram, "phuong": st.TenPhuong, "loai": st.Loai})
		}
		return res, e
	case "river":
		sts, e := s.stationSvc.ListRiverStationsFiltered(ctx, o, rv)
		var res []map[string]interface{}
		for _, st := range sts {
			res = append(res, map[string]interface{}{"id": st.ID, "name": st.TenTram, "phuong": st.TenPhuong, "loai": st.Loai})
		}
		return res, e
	}
	return nil, fmt.Errorf("invalid type")
}
func (s *service) handleRA(ctx context.Context, c *genai.FunctionCall, o string, ids []string) (interface{}, error) {
	sID, _ := c.Args["station_id"].(float64)
	if o != "" {
		al, _ := s.stationSvc.ListRainStationsFiltered(ctx, o, ids)
		f := false
		for _, st := range al {
			if int64(st.OldID) == int64(sID) {
				f = true
				break
			}
		}
		if !f {
			return nil, fmt.Errorf("no permission")
		}
	}
	y, _ := c.Args["year"].(float64)
	m, _ := c.Args["month"].(float64)
	sd, _ := c.Args["start_date"].(string)
	ed, _ := c.Args["end_date"].(string)
	gb, _ := c.Args["group_by"].(string)
	return s.stationDataSvc.GetRainAnalytics(ctx, int64(sID), int(y), int(m), sd, ed, gb)
}
func (s *service) handleCW(ctx context.Context, o string, ids []string) (interface{}, error) {
	r, _ := s.stationSvc.ListRainStationsFiltered(ctx, o, ids)
	w := make(map[string]bool)
	for _, st := range r {
		if st.TenPhuong != "" {
			w[st.TenPhuong] = true
		}
	}
	var res []string
	for k := range w {
		res = append(res, k)
	}
	return res, nil
}
func (s *service) handleCT(ctx context.Context, c *genai.FunctionCall, uID string) (interface{}, error) {
	switch c.Name {
	case ToolReportEmergencyProgress:
		p := &models.EmergencyConstructionProgress{ConstructionID: c.Args["construction_id"].(string), ReportDate: time.Now().Unix(), WorkDone: c.Args["work_done"].(string), ProgressPercentage: int(c.Args["progress_percentage"].(float64)), Issues: c.Args["issues"].(string), IsCompleted: c.Args["is_completed"].(bool), ReportedBy: uID}
		if ed, ok := c.Args["expected_completion_date"].(string); ok && ed != "" {
			if t, e := time.Parse("2006-01-02", ed); e == nil {
				p.ExpectedCompletionDate = t.Unix()
			}
		}
		return map[string]string{"status": "success"}, s.emcSvc.ReportProgress(ctx, p, nil)
	case ToolEmergencyHistory:
		return s.emcSvc.GetProgressHistory(ctx, c.Args["construction_id"].(string))
	case ToolEmergencyList:
		res, _, e := s.emcSvc.List(ctx, filter.NewPaginationFilter())
		return res, e
	case ToolRecentEmergencyReports:
		f := filter.NewPaginationFilter()
		f.PerPage = 200
		start := time.Now().AddDate(0, 0, -2)
		end := time.Now()
		if s, ok := c.Args["start_date"].(string); ok && s != "" {
			if t, e := time.Parse("2006-01-02", s); e == nil {
				start = t
			}
		}
		if e, ok := c.Args["end_date"].(string); ok && e != "" {
			if t, e := time.Parse("2006-01-02", e); e == nil {
				end = t
			}
		}
		f.AddWhere("report_date", "report_date", bson.M{"$gte": start.Unix(), "$lte": end.Unix()})
		res, _, e := s.emcSvc.ListHistory(ctx, f)
		return res, e
	case ToolUnfinishedEmergencyHistory:
		return s.emcSvc.GetUnfinishedProgressHistory(ctx)
	default:
		return nil, fmt.Errorf("unknown tool")
	}
}

type weatherStationSummary struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
}
type weatherSystemOverview struct {
	TotalStations int                     `json:"total_stations"`
	Breakdown     []weatherStationSummary `json:"breakdown"`
}
