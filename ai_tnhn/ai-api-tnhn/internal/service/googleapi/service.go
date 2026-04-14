package googleapi

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/utils/number"
	"context"
	"fmt"

	"ai-api-tnhn/internal/service/email"
	"ai-api-tnhn/internal/service/inundation"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/weather"
	pumpingstation "ai-api-tnhn/internal/service/pumping_station"

	"go.mongodb.org/mongo-driver/bson"
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

type Service interface {
	GetStatus(ctx context.Context) (*GoogleStatus, error)
	GetRainSummary(ctx context.Context, orgID string) (*RainSummaryData, error)
	GetWaterSummary(ctx context.Context, orgID string) (*WaterSummaryData, error)
	GetInundationSummary(ctx context.Context, orgID string, assignedInuIDs []string) (*InundationSummaryData, error)
	GetPumpingStationSummary(ctx context.Context, orgID string, assignedIDs []string) (*PumpingStationSummaryData, error)
	GetRecentEmails(ctx context.Context, limit int) ([]email.EmailInfo, error)
	GetUnreadEmails(ctx context.Context, limit int) ([]email.EmailInfo, error)
	ReadEmailByTitle(ctx context.Context, title string) (*email.EmailDetail, error)
	ReadEmailByID(ctx context.Context, id uint32) (*email.EmailDetail, error)
	SetEmailService(svc email.Service)
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
}

func NewService(conf config.GoogleDriveConfig, oauthConf config.OAuthConfig, aiUsageRepo repository.AiUsage, inuSvc inundation.Service, weatherSvc weather.Service, stationSvc station.Service, pumpingSvc pumpingstation.Service) (Service, error) {
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
		stationSvc:  stationSvc,
		pumpingSvc:  pumpingSvc,
	}, nil
}

func (s *service) SetEmailService(svc email.Service) {
	s.emailSvc = svc
}

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
		} else {
			fmt.Printf("Warning: failed to fetch unread emails via IMAP: %v\n", err)
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
	} else {
		fmt.Printf("Warning: failed to fetch drive quota: %v\n", err)
	}

	aiStats, err := s.aiUsageRepo.GetAggregateStats(ctx, bson.M{})
	if err == nil {
		var totalTokens int64
		if val, ok := aiStats["total_tokens"]; ok {
			switch v := val.(type) {
			case int32:
				totalTokens = int64(v)
			case int64:
				totalTokens = v
			case float64:
				totalTokens = int64(v)
			}
		}

		var reqCount int64
		if val, ok := aiStats["request_count"]; ok {
			switch v := val.(type) {
			case int32:
				reqCount = int64(v)
			case int64:
				reqCount = v
			case float64:
				reqCount = int64(v)
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
