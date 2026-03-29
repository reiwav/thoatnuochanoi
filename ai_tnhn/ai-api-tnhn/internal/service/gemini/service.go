package gemini

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/contract"
	"ai-api-tnhn/internal/service/emergency_construction"
	"ai-api-tnhn/internal/service/googleapi"
	"ai-api-tnhn/internal/service/inundation"
	querysvc "ai-api-tnhn/internal/service/query"
	"ai-api-tnhn/internal/service/stationdata"
	"ai-api-tnhn/internal/service/water"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"ai-api-tnhn/internal/models"

	"github.com/google/generative-ai-go/genai"
	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/sync/errgroup"
	"google.golang.org/api/option"
)

const chatSysInstruction = `Bạn là trợ lý AI thông minh của Hệ thống Thoát nước Hà Nội (TNHN). Hãy trả lời câu hỏi của người dùng một cách lịch sự, chuyên nghiệp và hữu ích bằng tiếng Việt.

QUY TẮC TRẢ LỜI QUAN TRỌNG:
1. LƯỢNG MƯA HIỆN TẠI: Khi báo cáo lượng mưa tại các điểm, phải hiển thị đầy đủ:
   + Tên điểm (Trạm)
   + Lượng mưa (mm)
   + Giờ bắt đầu mưa (start_time)
   + Giờ kết thúc/Cập nhật mới nhất (end_time)

2. TÌNH TRẠNG NGẬP LỤT:
   + Chỉ sử dụng dữ liệu từ công cụ 'get_live_inundation_summary' hoặc dữ liệu về điểm ngập trong hệ thống.
   + TRÌNH BÀY DẠNG VĂN BẢN THUẦN, KHÔNG BAO GỒM ẢNH trong phần trả lời về điểm ngập.

3. KẾT HỢP DỮ LIỆU (PROXIMITY MATCHING):
   + Khi báo cáo về một điểm ngập, hãy chủ động tra cứu và hiển thị lượng mưa ở trạm đo gần khu vực đó nhất (Ví dụ: Nếu điểm ngập ở Thanh Xuân, hãy hiển thị thêm lượng mưa đo được tại trạm Thanh Xuân từ dữ liệu 'get_live_rain_summary').

4. BÁO CÁO CÔNG TRÌNH KHẨN CẤP (BC CT KC):
   + Khi người dùng yêu cầu 'Báo cáo Công trình Khẩn cấp' hoặc 'BC CT KC', hãy sử dụng công cụ 'get_unfinished_emergency_work_history' để lấy toàn bộ dữ liệu của các công trình chưa xong và toàn bộ lịch sử tiến độ của chúng.
   + Trình bày báo cáo theo từng công trình: Liệt kê tên công trình, vị trí, các cột mốc tiến độ quan trọng từ trước đến nay, % hoàn thành hiện tại và các vướng mắc, đề xuất.
   + Không cần hỏi về ngày tháng khi làm báo cáo BC CT KC vì hệ thống sẽ lấy toàn bộ lịch sử.

5. CÔNG TÁC THI CÔNG: Bạn có thể báo cáo tiến độ thi công hàng ngày cho một công trình cụ thể bằng 'report_emergency_work_progress'. Khi báo cáo, hãy hỏi: nội dung công việc, % hoàn thành, vướng mắc và ngày dự kiến xong.

6. EMAIL: Bạn có thể đọc nội dung chi tiết email. Khi liệt kê danh sách email trong bảng, hãy thêm cột 'Thao tác' với link: [Xem chi tiết](#email-detail-[ID]).`

type ChatMessage struct {
	Role    string `json:"role"` // "user" or "model"
	Content string `json:"content"`
}

type Service interface {
	Chat(ctx context.Context, prompt string, history []ChatMessage, userID string) (string, error)
	ChatContract(ctx context.Context, prompt string, history []ChatMessage, userID string) (string, error)
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
	querySvc              querysvc.Service
	stationDataSvc        stationdata.Service
	emcSvc                emergency_construction.Service
	contractSvc           contract.Service
	aiUsageRepo           repository.AiUsage
}

func NewService(apiKey string, apiKeyContract string, waterSvc water.Service, googleApiSvc googleapi.Service, inuSvc inundation.Service, querySvc querysvc.Service, stationDataSvc stationdata.Service, emcSvc emergency_construction.Service, contractSvc contract.Service, aiUsageRepo repository.AiUsage) (Service, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("gemini api key is required")
	}

	keys := strings.Split(apiKey, ",")
	var clients []*genai.Client
	var contractClients []*genai.Client
	ctx := context.Background()

	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		client, err := genai.NewClient(ctx, option.WithAPIKey(key))
		if err == nil {
			clients = append(clients, client)
		}
	}

	contractKeys := strings.Split(apiKeyContract, ",")
	for _, key := range contractKeys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		client, err := genai.NewClient(ctx, option.WithAPIKey(key))
		if err == nil {
			contractClients = append(contractClients, client)
		}
	}

	if len(clients) == 0 {
		return nil, fmt.Errorf("failed to create any valid gemini client")
	}

	if len(contractClients) == 0 {
		contractClients = clients
	}

	return &service{
		clients:         clients,
		contractClients: contractClients,
		waterSvc:        waterSvc,
		googleApiSvc:    googleApiSvc,
		inuSvc:          inuSvc,
		querySvc:        querySvc,
		stationDataSvc:  stationDataSvc,
		emcSvc:          emcSvc,
		contractSvc:     contractSvc,
		aiUsageRepo:     aiUsageRepo,
	}, nil
}

func (s *service) getClient() *genai.Client {
	s.mu.Lock()
	defer s.mu.Unlock()
	client := s.clients[s.roundRobinIdx]
	s.roundRobinIdx = (s.roundRobinIdx + 1) % len(s.clients)
	return client
}

func (s *service) getContractClient() *genai.Client {
	s.mu.Lock()
	defer s.mu.Unlock()
	client := s.contractClients[s.contractRoundRobinIdx]
	s.contractRoundRobinIdx = (s.contractRoundRobinIdx + 1) % len(s.contractClients)
	return client
}

func (s *service) Chat(ctx context.Context, prompt string, history []ChatMessage, userID string) (string, error) {
	// Pre-process prompt for special keywords (mưa 3 ngày trước)
	lowerPrompt := strings.ToLower(prompt)
	if strings.Contains(lowerPrompt, "mưa") && (strings.Contains(lowerPrompt, "3 ngày trước") || strings.Contains(lowerPrompt, "ba ngày trước")) {
		now := time.Now()
		targetDate := now.AddDate(0, 0, -3)
		dateStr := targetDate.Format("2006-01-02")

		rainData, err := s.waterSvc.GetRainDataByDate(ctx, dateStr)
		if err == nil {
			dataJSON, _ := json.Marshal(rainData)
			prompt = fmt.Sprintf("[Hệ thống cung cấp thêm context]: Dữ liệu lượng mưa thực tế ngày %s (3 ngày trước tính từ %s): %s\n\n[Câu hỏi của người dùng]: %s",
				dateStr, now.Format("2006-01-02"), string(dataJSON), prompt)
		}
	} else {
		// Always add current time for context
		prompt = fmt.Sprintf("[Hệ thống]: Thời gian hiện tại là %s\n\n[Câu hỏi của người dùng]: %s",
			time.Now().Format("2006-01-02 15:04:05"), prompt)
	}

	// Define Tools
	tools := []*genai.FunctionDeclaration{
		{
			Name:        "get_google_status",
			Description: "Lấy trạng thái hệ thống: số email và danh sách 20 email gần nhất (kèm ID và link API chi tiết), dung lượng Drive và thống kê sử dụng AI.",
		},
		{
			Name:        "get_live_rain_summary",
			Description: "Tóm tắt tình hình mưa hiện tại ở Hà Nội dựa trên dữ liệu thực tế từ các trạm đo.",
		},
		{
			Name:        "get_rain_data_by_date",
			Description: "Lấy dữ liệu lượng mưa của các trạm trong một ngày cụ thể.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"date": {Type: genai.TypeString, Description: "Ngày (YYYY-MM-DD)"},
				},
				Required: []string{"date"},
			},
		},
		{
			Name:        "get_lake_data_by_date",
			Description: "Lấy dữ liệu mực nước hồ trong một ngày cụ thể.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"date": {Type: genai.TypeString, Description: "Ngày (YYYY-MM-DD)"},
				},
				Required: []string{"date"},
			},
		},
		{
			Name:        "get_river_data_by_date",
			Description: "Lấy dữ liệu mực nước sông trong một ngày cụ thể.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"date": {Type: genai.TypeString, Description: "Ngày (YYYY-MM-DD)"},
				},
				Required: []string{"date"},
			},
		},
		{
			Name:        "get_system_overview",
			Description: "Lấy tổng quan về số lượng các trạm đo (mưa, hồ, sông) trong hệ thống.",
		},
		{
			Name:        "list_stations_by_type",
			Description: "Lấy danh sách các trạm đo theo loại (rain, lake, river). Trả về ID, tên và địa chỉ.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"type": {Type: genai.TypeString, Description: "Loại trạm: 'rain', 'lake', hoặc 'river'"},
				},
				Required: []string{"type"},
			},
		},
		{
			Name:        "get_rain_analytics",
			Description: "Lấy số liệu phân tích lượng mưa (tổng, trung bình, lớn nhất). Hỗ trợ theo năm, tháng hoặc khoảng ngày. LUÔN LUÔN sử dụng 'group_by' (như 'month' hoặc 'year') khi truy vấn dữ liệu theo năm để tránh quá tải.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"station_id": {Type: genai.TypeInteger, Description: "ID trạm (nếu muốn lọc theo trạm, để 0 nếu muốn lấy toàn thành phố)"},
					"year":       {Type: genai.TypeInteger, Description: "Năm phân tích (vd: 2024)"},
					"month":      {Type: genai.TypeInteger, Description: "Tháng phân tích (1-12, để 0 nếu muốn lấy cả năm)"},
					"start_date": {Type: genai.TypeString, Description: "Ngày bắt đầu (YYYY-MM-DD)"},
					"end_date":   {Type: genai.TypeString, Description: "Ngày kết thúc (YYYY-MM-DD)"},
					"group_by":   {Type: genai.TypeString, Description: "Nhóm theo: 'year', 'month', hoặc 'date' (mặc định là 'date', nên dùng 'month' cho báo cáo năm)"},
				},
			},
		},
		{
			Name:        "get_covered_wards",
			Description: "Lấy danh sách tất cả các phường/xã mà hệ thống đang có trạm đo và đang xử lý dữ liệu.",
		},
		{
			Name:        "get_live_water_summary",
			Description: "Lấy thông tin tổng hợp mực nước hiện tại từ các trạm đo hồ và sông.",
		},
		{
			Name:        "get_live_inundation_summary",
			Description: "Lấy thông tin tổng hợp tình hình ngập lụt hiện tại (các điểm đang ngập, chưa kết thúc).",
		},
		{
			Name:        "get_rain_summary_by_ward",
			Description: "Lấy tổng hợp lượng mưa theo từng Phường/Xã trong một khoảng thời gian.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"year":       {Type: genai.TypeInteger, Description: "Năm phân tích (vd: 2024)"},
					"month":      {Type: genai.TypeInteger, Description: "Tháng phân tích (1-12, để 0 nếu muốn lấy cả năm)"},
					"start_date": {Type: genai.TypeString, Description: "Ngày bắt đầu (YYYY-MM-DD)"},
					"end_date":   {Type: genai.TypeString, Description: "Ngày kết thúc (YYYY-MM-DD)"},
				},
			},
		},
		{
			Name:        "database_query",
			Description: "Truy vấn dữ liệu thô từ cơ sở dữ liệu MongoDB (chỉ đọc). Dùng khi các công cụ khác không đáp ứng được. LUÔN LUÔN sử dụng bộ lọc (filter) để giới hạn dữ liệu nếu có thể.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"collection": {Type: genai.TypeString, Description: "Tên bộ sưu tập (vd: rain_stations, lake_records, inundation_stations)"},
					"filter":     {Type: genai.TypeObject, Description: "Bộ lọc MongoDB (vd: {\"quan\": \"Ba Đình\"})"},
				},
				Required: []string{"collection"},
			},
		},
		{
			Name:        "read_email_by_title",
			Description: "Tìm và đọc chi tiết một email (đã đọc hoặc chưa đọc) dựa trên tiêu đề trong số các email gần nhất. Trả về nội dung email và các link tải file đính kèm nếu có.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"title": {Type: genai.TypeString, Description: "Tiêu đề email cần tìm (fuzzy search)"},
				},
				Required: []string{"title"},
			},
		},
		{
			Name:        "read_email_by_id",
			Description: "Đọc chi tiết một email dựa trên ID duy nhất. Dùng khi người dùng nhấn nút 'Xem chi tiết' từ bảng danh sách.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"id": {Type: genai.TypeInteger, Description: "ID duy nhất của email (SeqNum)"},
				},
				Required: []string{"id"},
			},
		},
		{
			Name:        "report_emergency_work_progress",
			Description: "Báo cáo tiến độ công việc hàng ngày cho một công trình khẩn. Bạn cần ID công trình (construction_id).",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"construction_id":          {Type: genai.TypeString, Description: "ID của công trình"},
					"work_done":                {Type: genai.TypeString, Description: "Mô tả công việc đã làm được trong ngày"},
					"progress_percentage":      {Type: genai.TypeInteger, Description: "Phần trăm hoàn thành của công trình (0-100)"},
					"issues":                   {Type: genai.TypeString, Description: "Các vướng mắc, khó khăn gặp phải (nếu có)"},
					"is_completed":             {Type: genai.TypeBoolean, Description: "Công trình đã hoàn thành chưa?"},
					"expected_completion_date": {Type: genai.TypeString, Description: "Ngày dự kiến hoàn thành nếu chưa xong (YYYY-MM-DD)"},
				},
				Required: []string{"construction_id", "work_done"},
			},
		},
		{
			Name:        "get_emergency_work_history",
			Description: "Lấy lịch sử báo cáo tiến độ thi công của một công trình khẩn theo ID.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"construction_id": {Type: genai.TypeString, Description: "ID của công trình"},
				},
				Required: []string{"construction_id"},
			},
		},
		{
			Name:        "get_emergency_constructions",
			Description: "Lấy danh sách tất cả các công trình khẩn đang có trong hệ thống.",
		},
		{
			Name:        "get_recent_emergency_reports",
			Description: "Lấy danh sách các báo cáo tiến độ gần đây của tất cả các công trình khẩn. Hỗ trợ lọc theo ngày.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"start_date": {Type: genai.TypeString, Description: "Ngày bắt đầu (YYYY-MM-DD), mặc định là hôm kia nếu để trống"},
					"end_date":   {Type: genai.TypeString, Description: "Ngày kết thúc (YYYY-MM-DD), mặc định là hôm nay nếu để trống"},
				},
			},
		},
		{
			Name:        "get_unfinished_emergency_work_history",
			Description: "Lấy TOÀN BỘ lịch sử báo cáo tiến độ của tất cả các công trình CHƯA HOÀN THÀNH. Không cần lọc theo ngày.",
		},
	}

	client := s.getClient()
	model := client.GenerativeModel("gemini-2.5-flash")
	model.SystemInstruction = &genai.Content{Parts: []genai.Part{genai.Text(chatSysInstruction)}}
	model.Tools = []*genai.Tool{{FunctionDeclarations: tools}}

	// Build history
	var genaiHistory []*genai.Content
	for _, msg := range history {
		genaiHistory = append(genaiHistory, &genai.Content{
			Role:  msg.Role,
			Parts: []genai.Part{genai.Text(msg.Content)},
		})
	}

	session := model.StartChat()
	session.History = genaiHistory

	fmt.Printf("\n=== [Gemini Chat] User Prompt ===\n%s\n=================================\n", prompt)

	resp, err := session.SendMessage(ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("failed to send gemini message: %w", err)
	}
	s.recordUsage(ctx, resp.UsageMetadata)

	for {
		if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
			break
		}

		var toolCalls []*genai.FunctionCall
		for _, part := range resp.Candidates[0].Content.Parts {
			if call, ok := part.(genai.FunctionCall); ok {
				toolCalls = append(toolCalls, &call)
			}
		}

		if len(toolCalls) == 0 {
			break
		}

		var toolResponses []genai.Part
		var mu sync.Mutex
		g, gCtx := errgroup.WithContext(ctx)

		for _, call := range toolCalls {
			call := call // capture
			g.Go(func() error {
				var result interface{}
				var toolErr error

				fmt.Printf(" [Gemini Chat] Tool Call: %s with args: %v\n", call.Name, call.Args)

				switch call.Name {
				case "get_google_status":
					result, toolErr = s.googleApiSvc.GetStatus(gCtx)
				case "get_live_rain_summary":
					result, toolErr = s.googleApiSvc.GetRainSummary(gCtx)
				case "get_live_water_summary":
					result, toolErr = s.googleApiSvc.GetWaterSummary(gCtx)
				case "get_live_inundation_summary":
					result, toolErr = s.googleApiSvc.GetInundationSummary(gCtx)
				case "get_rain_data_by_date":
					date, _ := call.Args["date"].(string)
					result, toolErr = s.waterSvc.GetRainDataByDate(gCtx, date)
				case "get_lake_data_by_date":
					date, _ := call.Args["date"].(string)
					result, toolErr = s.waterSvc.GetLakeDataByDate(gCtx, date)
				case "get_river_data_by_date":
					date, _ := call.Args["date"].(string)
					result, toolErr = s.waterSvc.GetRiverDataByDate(gCtx, date)
				case "get_system_overview":
					result, toolErr = s.stationDataSvc.GetSystemOverview(gCtx)
				case "list_stations_by_type":
					stationType, _ := call.Args["type"].(string)
					result, toolErr = s.stationDataSvc.GetStationsByType(gCtx, stationType)
				case "get_rain_analytics":
					stationID, _ := call.Args["station_id"].(float64)
					year, _ := call.Args["year"].(float64)
					month, _ := call.Args["month"].(float64)
					startDate, _ := call.Args["start_date"].(string)
					endDate, _ := call.Args["end_date"].(string)
					groupBy, _ := call.Args["group_by"].(string)
					result, toolErr = s.stationDataSvc.GetRainAnalytics(gCtx, int64(stationID), int(year), int(month), startDate, endDate, groupBy)
				case "get_covered_wards":
					result, toolErr = s.stationDataSvc.GetCoveredWards(gCtx)
				case "get_rain_summary_by_ward":
					year, _ := call.Args["year"].(float64)
					month, _ := call.Args["month"].(float64)
					startDate, _ := call.Args["start_date"].(string)
					endDate, _ := call.Args["end_date"].(string)
					result, toolErr = s.stationDataSvc.GetRainSummaryByWard(gCtx, int(year), int(month), startDate, endDate)
				case "database_query":
					coll, _ := call.Args["collection"].(string)
					filter, _ := call.Args["filter"].(map[string]interface{})
					result, toolErr = s.querySvc.Query(gCtx, coll, filter, 0)
				case "read_email_by_title":
					title, _ := call.Args["title"].(string)
					result, toolErr = s.googleApiSvc.ReadEmailByTitle(gCtx, title)
				case "read_email_by_id":
					id, _ := call.Args["id"].(float64)
					result, toolErr = s.googleApiSvc.ReadEmailByID(gCtx, uint32(id))
				case "report_emergency_work_progress":
					constructionID, _ := call.Args["construction_id"].(string)
					workDone, _ := call.Args["work_done"].(string)
					progressPercentage, _ := call.Args["progress_percentage"].(float64)
					issues, _ := call.Args["issues"].(string)
					isCompleted, _ := call.Args["is_completed"].(bool)
					expectedDateStr, _ := call.Args["expected_completion_date"].(string)
					var expectedDate int64
					if expectedDateStr != "" {
						t, err := time.Parse("2006-01-02", expectedDateStr)
						if err == nil {
							expectedDate = t.Unix()
						}
					}
					progress := &models.EmergencyConstructionProgress{
						ConstructionID:         constructionID,
						ReportDate:             time.Now().Unix(),
						WorkDone:               workDone,
						ProgressPercentage:     int(progressPercentage),
						Issues:                 issues,
						IsCompleted:            isCompleted,
						ExpectedCompletionDate: expectedDate,
						ReportedBy:             userID,
					}
					toolErr = s.emcSvc.ReportProgress(gCtx, progress, nil)
					result = map[string]string{"status": "success", "message": "Báo cáo tiến độ thành công"}
				case "get_emergency_work_history":
					constructionID, _ := call.Args["construction_id"].(string)
					result, toolErr = s.emcSvc.GetProgressHistory(gCtx, constructionID)
				case "get_emergency_constructions":
					result, _, toolErr = s.emcSvc.List(gCtx, filter.NewPaginationFilter())
				case "get_recent_emergency_reports":
					startDateStr, _ := call.Args["start_date"].(string)
					endDateStr, _ := call.Args["end_date"].(string)
					f := filter.NewPaginationFilter()
					f.PerPage = 200
					start := time.Now().AddDate(0, 0, -2)
					start = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, time.Local)
					end := time.Now()
					end = time.Date(end.Year(), end.Month(), end.Day(), 23, 59, 59, 0, time.Local)
					if startDateStr != "" {
						if t, e := time.Parse("2006-01-02", startDateStr); e == nil {
							start = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.Local)
						}
					}
					if endDateStr != "" {
						if t, e := time.Parse("2006-01-02", endDateStr); e == nil {
							end = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, time.Local)
						}
					}
					f.AddWhere("report_date", "report_date", bson.M{
						"$gte": start.Unix(),
						"$lte": end.Unix(),
					})
					result, _, toolErr = s.emcSvc.ListHistory(gCtx, f)
				case "get_unfinished_emergency_work_history":
					result, toolErr = s.emcSvc.GetUnfinishedProgressHistory(gCtx)
				default:
					toolErr = fmt.Errorf("unknown tool: %s", call.Name)
				}

				mu.Lock()
				defer mu.Unlock()

				if toolErr != nil {
					toolResponses = append(toolResponses, genai.FunctionResponse{
						Name:     call.Name,
						Response: map[string]interface{}{"error": toolErr.Error()},
					})
				} else {
					jsonBytes, _ := json.Marshal(result)
					respStr := string(jsonBytes)
					fmt.Printf("\n=== [Gemini Chat] Tool Result Data (%s) ===\n%s\n===============================================\n", call.Name, respStr)
					const maxContentLen = 30000
					if len(respStr) > maxContentLen {
						respStr = respStr[:maxContentLen] + "... (dữ liệu quá lớn, đã được cắt bớt để tối ưu context)"
					}
					toolResponses = append(toolResponses, genai.FunctionResponse{
						Name:     call.Name,
						Response: map[string]interface{}{"result": respStr},
					})
				}
				return nil
			})
		}

		_ = g.Wait()

		resp, err = session.SendMessage(ctx, toolResponses...)
		if err != nil {
			return "", fmt.Errorf("failed to send tool responses: %w", err)
		}
		s.recordUsage(ctx, resp.UsageMetadata)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "Xin lỗi, tôi không thể tìm thấy câu trả lời phù hợp.", nil
	}

	var finalResult string
	for _, part := range resp.Candidates[0].Content.Parts {
		finalResult += fmt.Sprintf("%v", part)
	}
	return finalResult, nil
}

func (s *service) ExtractTextFromPDF(ctx context.Context, pdfBytes []byte) (string, error) {
	client := s.getClient()
	model := client.GenerativeModel("gemini-2.5-flash") // Improved for extraction

	// Refined prompt for Page 1 only
	prompt := "Hãy trích xuất nội dung văn bản TRANG ĐẦU TIÊN (Trang 1) của file PDF này. Tuyệt đối không đọc các trang sau. Hãy trích xuất các thông tin về diễn biến thời tiết, lượng mưa, mực nước hồ và sông. Hãy trả về văn bản thuần túy, chính xác theo nội dung trong file."

	resp, err := model.GenerateContent(ctx,
		genai.Blob{MIMEType: "application/pdf", Data: pdfBytes},
		genai.Text(prompt),
	)
	if err != nil {
		return "", fmt.Errorf("failed to extract text via Gemini: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content generated by Gemini")
	}

	var result strings.Builder
	for _, part := range resp.Candidates[0].Content.Parts {
		result.WriteString(fmt.Sprintf("%v", part))
	}

	return result.String(), nil
}

func (s *service) recordUsage(ctx context.Context, usage *genai.UsageMetadata) {
	if usage == nil {
		return
	}
	u := &models.AiUsage{
		ModelName:       "gemini-2.5-flash",
		PromptTokens:    int(usage.PromptTokenCount),
		CandidateTokens: int(usage.CandidatesTokenCount),
		TotalTokens:     int(usage.TotalTokenCount),
		Timestamp:       time.Now(),
	}
	go func() {
		_ = s.aiUsageRepo.Save(context.Background(), u)
	}()
}
