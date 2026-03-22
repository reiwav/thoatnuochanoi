package ai

import (
	"context"
	"encoding/json"
	"log"
	"sensor-backend/internal/models"
	"sensor-backend/internal/service/sensor"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
	"time"
)

type Service interface {
	Chat(ctx context.Context, history []models.ChatMessage, message string) (string, error)
}

type service struct {
	genaiClient *genai.Client
	model       *genai.GenerativeModel
	sensorSvc   sensor.Service
}

func NewService(ctx context.Context, apiKey string, sensorSvc sensor.Service) (Service, error) {
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, err
	}

	model := client.GenerativeModel("gemini-2.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(`Bạn là trợ lý AI cho hệ thống quản lý cảm biến Thoát nước Hà Nội. 
Khi trả về kết quả, hãy luôn thực hiện các bước sau:
1. LUÔN LUÔN gọi hàm 'list_devices' để lấy danh sách tên trạm (Name) tương ứng với Link/IP.
2. Trong báo cáo, phải nêu rõ TÊN TRẠM thay vì chỉ nêu IP hay Link.
3. Khi phân tích dữ liệu:
   - Status = 0: Bình thường
   - Status = 1: Cảnh báo (Warning)
   - Status = 2: Báo động (High Alarm/Danger)
4. Phân tích chuyên môn và đưa ra khuyến nghị cụ thể cho từng TÊN TRẠM.
Sử dụng tiếng Việt tự nhiên, chuyên nghiệp.`)},
	}
	
	s := &service{
		genaiClient: client,
		model:       model,
		sensorSvc:   sensorSvc,
	}

	// Define tools for Function Calling
	s.model.Tools = []*genai.Tool{
		{
			FunctionDeclarations: []*genai.FunctionDeclaration{
				{
					Name:        "get_monitor_data",
					Description: "Get current status of all sensors for a specific station (device link).",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
						Properties: map[string]*genai.Schema{
							"link": {
								Type:        genai.TypeString,
								Description: "The device link (URL) of the station.",
							},
						},
						Required: []string{"link"},
					},
				},
				{
					Name:        "get_alarms",
					Description: "Get recent alarms/events for a specific station.",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
						Properties: map[string]*genai.Schema{
							"link": {
								Type:        genai.TypeString,
								Description: "The device link (URL) of the station.",
							},
						},
						Required: []string{"link"},
					},
				},
				{
					Name:        "get_history_trend",
					Description: "Get historical sensor data (history trend) for a station and a specific channel.",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
						Properties: map[string]*genai.Schema{
							"link": {
								Type:        genai.TypeString,
								Description: "The device link (URL) of the station.",
							},
							"channel": {
								Type:        genai.TypeString,
								Description: "The sensor channel (e.g., '0', '1').",
							},
							"start_date": {
								Type:        genai.TypeString,
								Description: "Start date in YYYY-MM-DD format.",
							},
							"end_date": {
								Type:        genai.TypeString,
								Description: "End date in YYYY-MM-DD format.",
							},
						},
						Required: []string{"link", "channel"},
					},
				},
				{
					Name:        "list_devices",
					Description: "List all available stations/devices with their names and links.",
				},
				{
					Name:        "search_history",
					Description: "Search for sensor threshold exceedances (warnings/alarms) across all stations in a date range.",
					Parameters: &genai.Schema{
						Type: genai.TypeObject,
						Properties: map[string]*genai.Schema{
							"start_date": {
								Type:        genai.TypeString,
								Description: "Start date in YYYY-MM-DD format.",
							},
							"end_date": {
								Type:        genai.TypeString,
								Description: "End date in YYYY-MM-DD format.",
							},
						},
						Required: []string{"start_date", "end_date"},
					},
				},
			},
		},
	}

	return s, nil
}

func (s *service) Chat(ctx context.Context, history []models.ChatMessage, message string) (string, error) {
	session := s.model.StartChat()

	// Set history
	genaiHistory := make([]*genai.Content, 0, len(history))
	for _, m := range history {
		genaiHistory = append(genaiHistory, &genai.Content{
			Role:  m.Role,
			Parts: []genai.Part{genai.Text(m.Content)},
		})
	}
	session.History = genaiHistory

	resp, err := session.SendMessage(ctx, genai.Text(message))
	if err != nil {
		return "", err
	}

	return s.handleResponse(ctx, session, resp)
}

func (s *service) handleResponse(ctx context.Context, session *genai.ChatSession, resp *genai.GenerateContentResponse) (string, error) {
	for _, part := range resp.Candidates[0].Content.Parts {
		if fnCall, ok := part.(genai.FunctionCall); ok {
			log.Printf("AI calling function: %s with args: %v\n", fnCall.Name, fnCall.Args)

			var result interface{}
			var err error

			switch fnCall.Name {
			case "get_monitor_data":
				link := fnCall.Args["link"].(string)
				result, err = s.sensorSvc.GetMonitorData(ctx, link)
			case "get_alarms":
				link := fnCall.Args["link"].(string)
				result, err = s.sensorSvc.GetAlarms(ctx, link)
			case "get_history_trend":
				link := fnCall.Args["link"].(string)
				channel := fnCall.Args["channel"].(string)
				start, _ := fnCall.Args["start_date"].(string)
				end, _ := fnCall.Args["end_date"].(string)
				result, err = s.sensorSvc.GetHistoryTrend(ctx, link, channel, start, end)
			case "list_devices":
				result, err = s.sensorSvc.ListDevices(ctx)
			case "search_history":
				startStr := fnCall.Args["start_date"].(string)
				endStr := fnCall.Args["end_date"].(string)
				
				start, _ := time.Parse("2006-01-02", startStr)
				end, _ := time.Parse("2006-01-02", endStr)
				end = end.Add(24 * time.Hour) // Include end date fully

				result, err = s.sensorSvc.SearchHistory(ctx, start, end, 1) // 1 = Warning or higher
			}

			if err != nil {
				return "", err
			}

			// Convert result to a format compatible with StructPB (json-like maps/slices)
			var safeResult any
			b, _ := json.Marshal(result)
			json.Unmarshal(b, &safeResult)

			// Send function response back to AI
			resp, err = session.SendMessage(ctx, genai.FunctionResponse{
				Name: fnCall.Name,
				Response: map[string]interface{}{
					"result": safeResult,
				},
			})
			if err != nil {
				return "", err
			}
			return s.handleResponse(ctx, session, resp)
		}
	}

	// If no more function calls, return the text content
	var fullText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if text, ok := part.(genai.Text); ok {
			fullText += string(text)
		}
	}
	return fullText, nil
}
