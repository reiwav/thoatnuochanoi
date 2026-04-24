package googleapi

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/email"
	"ai-api-tnhn/internal/service/google/gemini/promt"
	"ai-api-tnhn/internal/service/inundation"
	pumpingstation "ai-api-tnhn/internal/service/pumping_station"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/water"
	"ai-api-tnhn/internal/service/weather"
	"ai-api-tnhn/utils/number"
	"context"
	"fmt"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/oauth2"
	"golang.org/x/sync/errgroup"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

type DriveQuota struct {
	Limit        int64  `json:"limit"`
	LimitStr     string `json:"limit_str"`
	Usage        int64  `json:"usage"`
	UsageStr     string `json:"usage_str"`
	UsageInDrive int64  `json:"usage_in_drive"`
}

type AiUsageStats struct {
	TotalTokens     int64   `json:"total_tokens"`
	TotalTokensStr  string  `json:"total_tokens_str"`
	TotalCostUSD    float64 `json:"total_cost_usd"`
	TotalCostUSDStr string  `json:"total_cost_usd_str"`
	RequestCount    int64   `json:"request_count"`
	RequestCountStr string  `json:"request_count_str"`
}

type GoogleStatus struct {
	UnreadEmails     int64             `json:"unread_emails"`
	UnreadEmailsStr  string            `json:"unread_emails_str"`
	UnreadEmailsList []email.EmailInfo `json:"unread_emails_list,omitempty"`
	DriveQuota       DriveQuota        `json:"drive_quota"`
	AiUsage          AiUsageStats      `json:"ai_usage"`
}

type CityStatus struct {
	Weather    *weather.RainSummaryData
	Water      *water.WaterSummaryData
	Inundation *inundation.InundationSummaryData
	Pumping    *pumpingstation.PumpingStationSummaryData
	RawWater   *weather.WaterDataResponse
	OCRText    string
}

type Service interface {
	GetStatus(ctx context.Context) (*GoogleStatus, error)
	GetRainSummary(ctx context.Context, orgID string, assignedIDs []string) (*weather.RainSummaryData, error)
	GetWaterSummary(ctx context.Context, orgID string, assignedIDs []string) (*water.WaterSummaryData, error)
	GetInundationSummary(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string) (*inundation.InundationSummaryData, error)
	GetPumpingStationSummary(ctx context.Context, orgID string, assignedIDs []string) (*pumpingstation.PumpingStationSummaryData, error)
	GetRecentEmails(ctx context.Context, limit int) ([]email.EmailInfo, error)
	GetUnreadEmails(ctx context.Context, limit int) ([]email.EmailInfo, error)
	ReadEmailByTitle(ctx context.Context, title string) (*email.EmailDetail, error)
	ReadEmailByID(ctx context.Context, id uint32) (*email.EmailDetail, error)
	SetEmailService(svc email.Service)
	SetGeminiService(svc interface {
		ExtractTextFromPDF(ctx context.Context, pdfBytes []byte) (string, error)
	})

	GetCityStatus(ctx context.Context) (*CityStatus, error)
	GenerateAIReport(ctx context.Context, reportType string, userID string) (string, error)
}

type service struct {
	driveSvc    *drive.Service
	gmailSvc    *gmail.Service
	aiUsageRepo repository.AiUsage
	inuSvc      inundation.Service
	emailSvc    email.Service
	weatherSvc  weather.Service
	stationSvc  station.Service
	pumpingSvc  pumpingstation.Service
	waterSvc    water.Service
	geminiSvc   interface {
		ExtractTextFromPDF(ctx context.Context, pdfBytes []byte) (string, error)
	}
	cache sync.Map
}

func NewService(conf config.GoogleDriveConfig, oauthConf config.OAuthConfig, aiUsageRepo repository.AiUsage, inuSvc inundation.Service, weatherSvc weather.Service, stationSvc station.Service, pumpingSvc pumpingstation.Service, waterSvc water.Service) (Service, error) {
	ctx := context.Background()
	var driveSvc *drive.Service
	var gmailSvc *gmail.Service
	var err error

	if conf.GoogleRefreshToken != "" {
		oauthConfig := &oauth2.Config{
			ClientID:     oauthConf.ClientID,
			ClientSecret: oauthConf.ClientSecret,
			Endpoint: oauth2.Endpoint{
				TokenURL: "https://oauth2.googleapis.com/token",
			},
			Scopes: []string{
				drive.DriveReadonlyScope,
				gmail.GmailReadonlyScope,
			},
		}

		token := &oauth2.Token{
			RefreshToken: conf.GoogleRefreshToken,
		}

		client := oauthConfig.Client(ctx, token)
		driveSvc, err = drive.NewService(ctx, option.WithHTTPClient(client))
		if err != nil {
			return nil, fmt.Errorf("failed to create drive service: %w", err)
		}
		gmailSvc, err = gmail.NewService(ctx, option.WithHTTPClient(client))
		if err != nil {
			return nil, fmt.Errorf("failed to create gmail service: %w", err)
		}
	} else {
		if conf.Credentials == "" {
			return nil, fmt.Errorf("google credentials not found")
		}
		driveSvc, err = drive.NewService(ctx, option.WithCredentialsJSON([]byte(conf.Credentials)))
		if err != nil {
			return nil, fmt.Errorf("failed to create drive service: %w", err)
		}
		gmailSvc, err = gmail.NewService(ctx, option.WithCredentialsJSON([]byte(conf.Credentials)))
		if err != nil {
			return nil, fmt.Errorf("failed to create gmail service: %w", err)
		}
	}

	return &service{
		driveSvc:    driveSvc,
		gmailSvc:    gmailSvc,
		aiUsageRepo: aiUsageRepo,
		inuSvc:      inuSvc,
		weatherSvc:  weatherSvc,
		pumpingSvc:  pumpingSvc,
		waterSvc:    waterSvc,
	}, nil
}

func (s *service) SetGeminiService(svc interface {
	ExtractTextFromPDF(ctx context.Context, pdfBytes []byte) (string, error)
}) {
	s.geminiSvc = svc
}

func (s *service) SetEmailService(svc email.Service) {
	s.emailSvc = svc
}

// ----------------------------------------------------------------------------
// Domain Delegations
// ----------------------------------------------------------------------------

func (s *service) GetRainSummary(ctx context.Context, orgID string, assignedIDs []string) (*weather.RainSummaryData, error) {
	return s.weatherSvc.GetRainSummary(ctx, orgID, assignedIDs)
}

func (s *service) GetWaterSummary(ctx context.Context, orgID string, assignedIDs []string) (*water.WaterSummaryData, error) {
	return s.waterSvc.GetWaterSummary(ctx, orgID, assignedIDs)
}

func (s *service) GetPumpingStationSummary(ctx context.Context, orgID string, assignedIDs []string) (*pumpingstation.PumpingStationSummaryData, error) {
	return s.pumpingSvc.GetPumpingStationSummary(ctx, orgID, assignedIDs)
}

func (s *service) GetInundationSummary(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string) (*inundation.InundationSummaryData, error) {
	return s.inuSvc.GetInundationSummary(ctx, orgID, isAllowedAll, assignedInuIDs)
}

// ----------------------------------------------------------------------------
// Email Service
// ----------------------------------------------------------------------------

func (s *service) GetRecentEmails(ctx context.Context, limit int) ([]email.EmailInfo, error) {
	if s.emailSvc == nil {
		return nil, fmt.Errorf("email service not initialized")
	}
	return s.emailSvc.GetRecentEmails(ctx, limit)
}

func (s *service) GetUnreadEmails(ctx context.Context, limit int) ([]email.EmailInfo, error) {
	if s.emailSvc == nil {
		return nil, fmt.Errorf("email service not initialized")
	}
	return s.emailSvc.GetUnreadEmails(ctx, limit)
}

func (s *service) ReadEmailByTitle(ctx context.Context, title string) (*email.EmailDetail, error) {
	if s.emailSvc == nil {
		return nil, fmt.Errorf("email service not initialized")
	}
	return s.emailSvc.ReadEmailByTitle(ctx, title)
}

func (s *service) ReadEmailByID(ctx context.Context, id uint32) (*email.EmailDetail, error) {
	if s.emailSvc == nil {
		return nil, fmt.Errorf("email service not initialized")
	}
	return s.emailSvc.ReadEmailByID(ctx, id)
}

// ----------------------------------------------------------------------------
// Status & Analytics
// ----------------------------------------------------------------------------

func (s *service) GetStatus(ctx context.Context) (*GoogleStatus, error) {
	status := &GoogleStatus{}

	if s.emailSvc != nil {
		count, err := s.emailSvc.GetUnreadCount(ctx)
		if err == nil {
			status.UnreadEmails = int64(count)
			status.UnreadEmailsStr = number.Format(int64(count))

			if count > 0 {
				list, err := s.emailSvc.GetRecentEmails(ctx, 20)
				if err == nil {
					status.UnreadEmailsList = list
				}
			}
		}
	}

	about, err := s.driveSvc.About.Get().Fields("storageQuota").Do()
	if err == nil && about.StorageQuota != nil {
		status.DriveQuota = DriveQuota{
			Limit:        about.StorageQuota.Limit,
			LimitStr:     number.Format(about.StorageQuota.Limit),
			Usage:        about.StorageQuota.Usage,
			UsageStr:     number.Format(about.StorageQuota.Usage),
			UsageInDrive: about.StorageQuota.UsageInDrive,
		}
	}

	aiStats, err := s.aiUsageRepo.GetAggregateStats(ctx, bson.M{})
	if err == nil {
		var totalTokens int64
		if val, ok := aiStats["total_tokens"]; ok {
			switch v := val.(type) {
			case int32: totalTokens = int64(v)
			case int64: totalTokens = v
			case float64: totalTokens = int64(v)
			}
		}

		var reqCount int64
		if val, ok := aiStats["request_count"]; ok {
			switch v := val.(type) {
			case int32: reqCount = int64(v)
			case int64: reqCount = v
			case float64: reqCount = int64(v)
			}
		}

		status.AiUsage = AiUsageStats{
			TotalTokens:     totalTokens,
			TotalTokensStr:  number.Format(totalTokens),
			RequestCount:    reqCount,
			RequestCountStr: number.Format(reqCount),
			TotalCostUSD:    float64(totalTokens) * 0.00000015,
			TotalCostUSDStr: number.FormatDecimal(float64(totalTokens)*0.00000015, 6),
		}
	}

	return status, nil
}

func (s *service) GetLatestOCRText(ctx context.Context) string {
	if s.emailSvc == nil || s.geminiSvc == nil {
		return ""
	}
	cacheKey := "latest_ocr_text"
	if cached, ok := s.cache.Load(cacheKey); ok {
		if detail, ok := cached.(*email.EmailDetail); ok {
			if time.Since(time.Unix(detail.Timestamp, 0)) < 2*time.Hour {
				return detail.Body
			}
		}
	}

	emailDetail, err := s.ReadEmailByTitle(ctx, "Dự báo thời tiết")
	if err != nil || emailDetail == nil || len(emailDetail.Attachments) == 0 {
		return ""
	}

	att := emailDetail.Attachments[0]
	raw, err := s.emailSvc.DownloadAttachment(ctx, emailDetail.ID, att.ID)
	if err != nil {
		return ""
	}

	ocrText, geminiErr := s.geminiSvc.ExtractTextFromPDF(ctx, raw)
	if geminiErr != nil {
		return ""
	}

	emailDetail.Body = ocrText
	s.cache.Store(cacheKey, emailDetail)
	return ocrText
}

func (s *service) GetCityStatus(ctx context.Context) (*CityStatus, error) {
	var res CityStatus
	var mu sync.Mutex
	g, gCtx := errgroup.WithContext(ctx)

	g.Go(func() error {
		weatherSum, _ := s.weatherSvc.GetRainSummary(gCtx, "", nil)
		mu.Lock()
		res.Weather = weatherSum
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		waterSum, _ := s.waterSvc.GetWaterSummary(gCtx, "", nil)
		mu.Lock()
		res.Water = waterSum
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		inuSum, _ := s.inuSvc.GetInundationSummary(gCtx, "", true, nil)
		mu.Lock()
		res.Inundation = inuSum
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		pumpingSum, _ := s.pumpingSvc.GetPumpingStationSummary(gCtx, "", nil)
		mu.Lock()
		res.Pumping = pumpingSum
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		ocr := s.GetLatestOCRText(gCtx)
		mu.Lock()
		res.OCRText = ocr
		mu.Unlock()
		return nil
	})
	g.Go(func() error {
		rawWater, _ := s.weatherSvc.GetRawWaterData(gCtx)
		mu.Lock()
		res.RawWater = rawWater
		mu.Unlock()
		return nil
	})

	_ = g.Wait()
	return &res, nil
}

// ----------------------------------------------------------------------------
// AI Report Generation
// ----------------------------------------------------------------------------

func (s *service) GenerateAIReport(ctx context.Context, reportType string, userID string) (string, error) {
	if s.geminiSvc == nil {
		return "", fmt.Errorf("gemini service is not initialized")
	}

	status, err := s.GetCityStatus(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get city status: %w", err)
	}

	now := time.Now()
	dd, mm, yyyy := now.Format("02"), now.Format("01"), now.Format("2006")
	hh := now.Format("15h04")

	var prompt string
	switch reportType {
	case "active_rain":
		prompt = s.buildActiveRainPrompt(status, hh, dd, mm, yyyy)
	case "viber":
		prompt = s.buildViberPrompt(status, hh, dd, mm, yyyy)
	case "dynamic":
		prompt = s.buildDynamicPrompt(status, hh, dd, mm, yyyy)
	default:
		return "", fmt.Errorf("unsupported report type: %s", reportType)
	}

	type fullGemini interface {
		Chat(ctx context.Context, prompt string, history interface{}, userID string, isCompany bool, logPrompt string) (string, error)
	}

	if gSvc, ok := s.geminiSvc.(fullGemini); ok {
		return gSvc.Chat(ctx, prompt, nil, userID, true, "GenerateAIReport:"+reportType)
	}

	return "", fmt.Errorf("gemini service does not support Chat method")
}

func (s *service) buildActiveRainPrompt(status *CityStatus, hh, dd, mm, yyyy string) string {
	soDiemMua := 0
	hasRain := false
	if status.Weather != nil {
		soDiemMua = status.Weather.RainyStations
		for _, m := range status.Weather.Measurements {
			if m.TotalRain > 0 {
				hasRain = true
				break
			}
		}
	}

	if soDiemMua == 0 && hasRain {
		return fmt.Sprintf(promt.Get("report_rain_stopped"), status.OCRText, hh, dd, mm, yyyy)
	} else if soDiemMua == 0 {
		return fmt.Sprintf(promt.Get("report_no_rain"), status.OCRText, hh, dd, mm, yyyy)
	}
	return fmt.Sprintf(promt.Get("report_active_rain"), status.OCRText, soDiemMua, hh, dd, mm, yyyy)
}

func (s *service) buildViberPrompt(status *CityStatus, hh, dd, mm, yyyy string) string {
	if status.Weather == nil { return "" }
	rainStartTime, rainEndTime := "rạng sáng", "thời điểm hiện tại"

	if !status.Weather.StartTimeFull.IsZero() { rainStartTime = status.Weather.StartTimeFull.Format("15h04") }
	if !status.Weather.EndTimeFull.IsZero() && time.Since(status.Weather.EndTimeFull) > 5*time.Minute {
		rainEndTime = status.Weather.EndTimeFull.Format("15h04")
	}

	rainIntensity := "nhỏ"
	if status.Weather.MaxRainStation.TotalRain > 100 { rainIntensity = "rất lớn" 
	} else if status.Weather.MaxRainStation.TotalRain > 50 { rainIntensity = "lớn" }
	
	rainSpread := "diện hẹp"
	if status.Weather.RainyStations > 20 { rainSpread = "diện rộng" }

	inuInfo := "Trên các tuyến đường an toàn, không xảy ra úng ngập"
	if status.Inundation != nil && status.Inundation.ActivePoints > 0 {
		inuInfo = status.Inundation.SummaryText + ": " + status.Inundation.FullSummary
	}

	rawSummary := fmt.Sprintf(`- Thời điểm báo cáo: %s ngày %s/%s/%s
- Thời điểm bắt đầu mưa: %s
- Thời điểm kết thúc mưa: %s
- Cường độ mưa: %s
- Diện mưa: %s (%d điểm đo)
- Lượng mưa phổ biến: 0.0 đến %.1f mm
- Điểm mưa lớn nhất: %s (%.1f mm)
- Tình trạng úng ngập: %s`,
		hh, dd, mm, yyyy, rainStartTime, rainEndTime, rainIntensity, rainSpread, status.Weather.RainyStations, 
		status.Weather.MaxRainStation.TotalRain, status.Weather.MaxRainStation.Name, status.Weather.MaxRainStation.TotalRain, inuInfo)

	return fmt.Sprintf(promt.Get("report_viber"), rawSummary)
}

func (s *service) buildDynamicPrompt(status *CityStatus, hh, dd, mm, yyyy string) string {
	rainIntro := "Hiện tại trên địa bàn thành phố không ghi nhận điểm mưa nào."
	if status.Weather != nil { rainIntro = status.Weather.SummaryText }

	waterStr := "Hiện tại mực nước trên hệ thống đang ở mức an toàn."
	if status.Water != nil && status.Water.SummaryText != "" { waterStr = status.Water.SummaryText }

	inuStr := "An toàn, không ngập."
	if status.Inundation != nil {
		inuStr = status.Inundation.FullSummary
		if inuStr == "" { inuStr = status.Inundation.SummaryText }
	}
	pumpStr := "Hiện tại không ghi nhận trạm bơm nào đang vận hành."
	if status.Pumping != nil { pumpStr = status.Pumping.SummaryText }

	return fmt.Sprintf(promt.Get("report_dynamic"), hh, dd+"/"+mm+"/"+yyyy, rainIntro, waterStr, inuStr, pumpStr)
}
