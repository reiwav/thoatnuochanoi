package gemini

import (
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/googleapi"
	"ai-api-tnhn/internal/service/inundation"
	querysvc "ai-api-tnhn/internal/service/query"
	"ai-api-tnhn/internal/service/stationdata"
	"ai-api-tnhn/internal/service/water"
	"ai-api-tnhn/utils/number"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"ai-api-tnhn/internal/models"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type ChatMessage struct {
	Role    string `json:"role"` // "user" or "model"
	Content string `json:"content"`
}

type Service interface {
	Chat(ctx context.Context, prompt string, history []ChatMessage) (string, error)
}

type service struct {
	client         *genai.Client
	model          *genai.GenerativeModel
	waterSvc       water.Service
	googleApiSvc   googleapi.Service
	inuSvc         inundation.Service
	querySvc       querysvc.Service
	stationDataSvc stationdata.Service
	aiUsageRepo    repository.AiUsage
}

func NewService(apiKey string, waterSvc water.Service, googleApiSvc googleapi.Service, inuSvc inundation.Service, querySvc querysvc.Service, stationDataSvc stationdata.Service, aiUsageRepo repository.AiUsage) (Service, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("gemini api key is required")
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create gemini client: %w", err)
	}

	// Use gemini-2.5-flash for faster and modern responses
	model := client.GenerativeModel("gemini-2.5-flash")

	// Set a system instruction to give the AI context
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text("Bạn là trợ lý AI thông minh của Hệ thống Thoát nước Hà Nội (TNHN). Hãy trả lời câu hỏi của người dùng một cách lịch sự, chuyên nghiệp và hữu ích bằng tiếng Việt. Nếu người dùng hỏi về hệ thống, hãy trả lời dựa trên kiến thức về thoát nước và hạ tầng đô thị. Bạn có khả năng tự động gọi các công cụ để lấy dữ liệu thực tế: lượng mưa, mực nước hồ/sông, trạng thái email/bộ nhớ, và các báo cáo ngập lụt."),
		},
	}

	return &service{
		client:         client,
		model:          model,
		waterSvc:       waterSvc,
		googleApiSvc:   googleApiSvc,
		inuSvc:         inuSvc,
		querySvc:       querySvc,
		stationDataSvc: stationDataSvc,
		aiUsageRepo:    aiUsageRepo,
	}, nil
}

func (s *service) Chat(ctx context.Context, prompt string, history []ChatMessage) (string, error) {
	// Define Tools
	tools := []*genai.FunctionDeclaration{
		{
			Name:        "get_google_status",
			Description: "Kiểm tra số lượng email chưa đọc và dung lượng bộ nhớ Google Drive.",
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
	}

	s.model.Tools = []*genai.Tool{{FunctionDeclarations: tools}}

	// Build history
	var genaiHistory []*genai.Content
	for _, msg := range history {
		genaiHistory = append(genaiHistory, &genai.Content{
			Role:  msg.Role,
			Parts: []genai.Part{genai.Text(msg.Content)},
		})
	}

	session := s.model.StartChat()
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
		for _, call := range toolCalls {
			var result interface{}
			var err error

			fmt.Printf(" [Gemini Chat] Tool Call: %s with args: %v\n", call.Name, call.Args)

			switch call.Name {
			case "get_google_status":
				result, err = s.googleApiSvc.GetStatus(ctx)
			case "get_live_rain_summary":
				result, err = s.googleApiSvc.GetRainSummary(ctx)
			case "get_live_water_summary":
				result, err = s.googleApiSvc.GetWaterSummary(ctx)
			case "get_live_inundation_summary":
				result, err = s.googleApiSvc.GetInundationSummary(ctx)
			case "get_rain_data_by_date":
				date, _ := call.Args["date"].(string)
				result, err = s.waterSvc.GetRainDataByDate(ctx, date)
			case "get_lake_data_by_date":
				date, _ := call.Args["date"].(string)
				result, err = s.waterSvc.GetLakeDataByDate(ctx, date)
			case "get_river_data_by_date":
				date, _ := call.Args["date"].(string)
				result, err = s.waterSvc.GetRiverDataByDate(ctx, date)
			case "list_inundation_reports":
				result, _, err = s.inuSvc.ListReports(ctx, "")
			case "get_system_overview":
				result, err = s.stationDataSvc.GetSystemOverview(ctx)
			case "list_stations_by_type":
				stationType, _ := call.Args["type"].(string)
				result, err = s.stationDataSvc.GetStationsByType(ctx, stationType)
			case "get_rain_analytics":
				stationID, _ := call.Args["station_id"].(float64) // genai args are float64 for numbers
				year, _ := call.Args["year"].(float64)
				month, _ := call.Args["month"].(float64)
				startDate, _ := call.Args["start_date"].(string)
				endDate, _ := call.Args["end_date"].(string)
				groupBy, _ := call.Args["group_by"].(string)
				result, err = s.stationDataSvc.GetRainAnalytics(ctx, int64(stationID), int(year), int(month), startDate, endDate, groupBy)
			case "get_covered_wards":
				result, err = s.stationDataSvc.GetCoveredWards(ctx)
			case "get_rain_summary_by_ward":
				year, _ := call.Args["year"].(float64)
				month, _ := call.Args["month"].(float64)
				startDate, _ := call.Args["start_date"].(string)
				endDate, _ := call.Args["end_date"].(string)
				result, err = s.stationDataSvc.GetRainSummaryByWard(ctx, int(year), int(month), startDate, endDate)
			case "database_query":
				coll, _ := call.Args["collection"].(string)
				filter, _ := call.Args["filter"].(map[string]interface{})
				result, err = s.querySvc.Query(ctx, coll, filter, 0)
			default:
				err = fmt.Errorf("unknown tool: %s", call.Name)
			}

			if err != nil {
				toolResponses = append(toolResponses, genai.FunctionResponse{
					Name:     call.Name,
					Response: map[string]interface{}{"error": err.Error()},
				})
			} else {
				// To avoid Protobuf 'invalid type' errors and Context Token Limit issues:
				// 1. Convert complex results to a JSON string.
				jsonBytes, _ := json.Marshal(result)
				respStr := string(jsonBytes)

				fmt.Printf("\n=== [Gemini Chat] Tool Result Data (%s) ===\n%s\n===============================================\n", call.Name, respStr)

				const maxContentLen = 30000 // Roughly 10-15k tokens safe margin
				if len(respStr) > maxContentLen {
					respStr = respStr[:maxContentLen] + "... (dữ liệu quá lớn, đã được cắt bớt để tối ưu context)"
				}

				toolResponses = append(toolResponses, genai.FunctionResponse{
					Name:     call.Name,
					Response: map[string]interface{}{"result": respStr},
				})
			}
		}

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
	return number.FormatText(finalResult), nil
}

func (s *service) recordUsage(ctx context.Context, usage *genai.UsageMetadata) {
	if usage == nil {
		return
	}
	u := &models.AiUsage{
		ModelName:       "gemini-2.5-flash", // Static for now as we hardcoded it in NewService
		PromptTokens:    int(usage.PromptTokenCount),
		CandidateTokens: int(usage.CandidatesTokenCount),
		TotalTokens:     int(usage.TotalTokenCount),
		Timestamp:       time.Now(),
	}
	// We don't want to block the user if recording fails
	go func() {
		_ = s.aiUsageRepo.Save(context.Background(), u)
	}()
}
