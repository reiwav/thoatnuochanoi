package googleapi

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/email"
	"ai-api-tnhn/internal/service/station/inundation"
	pumpingstation "ai-api-tnhn/internal/service/station/pumping_station"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/station/water"
	"ai-api-tnhn/internal/service/weather"
	"context"
	"fmt"
	"sync"

	"golang.org/x/oauth2"
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

type ChatMessage struct {
	Role    string `json:"role"` // "user" or "model"
	Content string `json:"content"`
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
		Chat(ctx context.Context, prompt string, history []ChatMessage, userID string, isCompany bool, logPrompt string) (string, error)
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
		Chat(ctx context.Context, prompt string, history []ChatMessage, userID string, isCompany bool, logPrompt string) (string, error)
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
			Endpoint: oauth2.Endpoint{TokenURL: "https://oauth2.googleapis.com/token"},
			Scopes:   []string{drive.DriveReadonlyScope, gmail.GmailReadonlyScope},
		}
		token := &oauth2.Token{RefreshToken: conf.GoogleRefreshToken}
		client := oauthConfig.Client(ctx, token)
		driveSvc, err = drive.NewService(ctx, option.WithHTTPClient(client))
		if err != nil { return nil, fmt.Errorf("failed to create drive service: %w", err) }
		gmailSvc, err = gmail.NewService(ctx, option.WithHTTPClient(client))
		if err != nil { return nil, fmt.Errorf("failed to create gmail service: %w", err) }
	} else {
		if conf.Credentials == "" { return nil, fmt.Errorf("google credentials not found") }
		driveSvc, err = drive.NewService(ctx, option.WithCredentialsJSON([]byte(conf.Credentials)))
		if err != nil { return nil, fmt.Errorf("failed to create drive service: %w", err) }
		gmailSvc, err = gmail.NewService(ctx, option.WithCredentialsJSON([]byte(conf.Credentials)))
		if err != nil { return nil, fmt.Errorf("failed to create gmail service: %w", err) }
	}

	return &service{
		driveSvc: driveSvc, gmailSvc: gmailSvc, aiUsageRepo: aiUsageRepo, inuSvc: inuSvc,
		weatherSvc: weatherSvc, pumpingSvc: pumpingSvc, waterSvc: waterSvc, stationSvc: stationSvc,
	}, nil
}

func (s *service) SetGeminiService(svc interface {
	ExtractTextFromPDF(ctx context.Context, pdfBytes []byte) (string, error)
	Chat(ctx context.Context, prompt string, history []ChatMessage, userID string, isCompany bool, logPrompt string) (string, error)
}) { s.geminiSvc = svc }

func (s *service) SetEmailService(svc email.Service) { s.emailSvc = svc }
