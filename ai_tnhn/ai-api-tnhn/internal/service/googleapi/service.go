package googleapi

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/utils/number"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"time"

	"ai-api-tnhn/internal/service/email"
	"ai-api-tnhn/internal/service/inundation"

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

type RainStationStat struct {
	Name        string  `json:"name"`
	TotalRain   float64 `json:"total_rain"`
	SessionRain float64 `json:"session_rain"`
	StartTime   string  `json:"start_time"`
}

type RainSummaryData struct {
	TotalStations  int               `json:"total_stations"`
	RainyStations  int               `json:"rainy_stations"`
	MaxRainStation RainStationStat   `json:"max_rain_station"`
	Measurements   []RainStationStat `json:"measurements"`
	SummaryText    string            `json:"summary_text,omitempty"`
}

type WaterStationStat struct {
	Name     string  `json:"name"`
	Level    float64 `json:"level"`
	Label    string  `json:"label"` // E.g., "Hồ", "Sông"
	ThoiGian string  `json:"thoi_gian"`
}

type WaterSummaryData struct {
	TotalStations int                `json:"total_stations"`
	LakeStations  []WaterStationStat `json:"lake_stations"`
	RiverStations []WaterStationStat `json:"river_stations"`
}

type InundationUpdateStat struct {
	Timestamp   string `json:"timestamp"`
	Description string `json:"description"`
	Depth       string `json:"depth"`
}

type InundationPointStat struct {
	StreetName    string                 `json:"street_name"`
	Depth         string                 `json:"depth"`
	StartTime     string                 `json:"start_time"`
	Description   string                 `json:"description"`
	CurrentStatus string                 `json:"current_status"`
	Updates       []InundationUpdateStat `json:"updates"`
}

type InundationSummaryData struct {
	ActivePoints  int                   `json:"active_points"`
	OngoingPoints []InundationPointStat `json:"ongoing_points"`
}

type Service interface {
	GetStatus(ctx context.Context) (*GoogleStatus, error)
	GetRainSummary(ctx context.Context) (*RainSummaryData, error)
	GetWaterSummary(ctx context.Context) (*WaterSummaryData, error)
	GetInundationSummary(ctx context.Context) (*InundationSummaryData, error)
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
}

func NewService(conf config.GoogleDriveConfig, oauthConf config.OAuthConfig, aiUsageRepo repository.AiUsage, inuSvc inundation.Service) (Service, error) {
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
		// Fallback to service account if possible, but Gmail usually needs user auth
		if conf.Credentials == "" {
			return nil, fmt.Errorf("google credentials not found")
		}
		driveSvc, err = drive.NewService(ctx, option.WithCredentialsJSON([]byte(conf.Credentials)))
		if err != nil {
			return nil, fmt.Errorf("failed to create drive service: %w", err)
		}
		// Gmail might not work well with service account without domain-wide delegation
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
	}, nil
}

func (s *service) SetEmailService(svc email.Service) {
	s.emailSvc = svc
}

func (s *service) GetStatus(ctx context.Context) (*GoogleStatus, error) {
	status := &GoogleStatus{}

	// 1. Get IMAP unread count
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

	// 2. Get Drive quota
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

	// 3. Get AI Usage stats
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
			// Approximate cost
			TotalCostUSD:    float64(totalTokens) * 0.00000015,
			TotalCostUSDStr: number.FormatDecimal(float64(totalTokens)*0.00000015, 6),
		}
	}

	return status, nil
}

type RainDataResponse struct {
	Code    int `json:"Code"`
	Content struct {
		Tram []struct {
			Id        int    `json:"Id"`
			TenTram   string `json:"TenTram"`
			TenPhuong string `json:"TenPhuong"`
		} `json:"tram"`
		Data []struct {
			TramId      int     `json:"TramId"`
			LuongMua_BD float64 `json:"LuongMua_BD"`
			ThoiGian_BD string  `json:"ThoiGian_BD"`
			LuongMua_HT float64 `json:"LuongMua_HT"`
			ThoiGian_HT string  `json:"ThoiGian_HT"`
		} `json:"data"`
	} `json:"Content"`
}

func (s *service) GetRainSummary(ctx context.Context) (*RainSummaryData, error) {
	url := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallrain?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	fmt.Printf(" [GoogleAPI] Calling Rain API: %s\n", url)
	resp, err := http.Get(url)
	if err != nil {
		fmt.Printf(" [GoogleAPI] Rain API Error: %v\n", err)
		return nil, err
	}
	defer resp.Body.Close()

	// Read body to log it
	bodyBytes, _ := io.ReadAll(resp.Body)
	limit := 500
	if len(bodyBytes) < limit {
		limit = len(bodyBytes)
	}
	fmt.Printf(" [GoogleAPI] Raw Response (first 500 chars): %s\n", string(bodyBytes[:limit]))

	var rainData RainDataResponse
	if err := json.Unmarshal(bodyBytes, &rainData); err != nil {
		return nil, err
	}

	stationMap := make(map[int]string)
	for _, t := range rainData.Content.Tram {
		stationMap[t.Id] = t.TenTram
	}

	fmt.Printf(" [GoogleAPI] Rain Data Count: %d, Stations Count: %d\n", len(rainData.Content.Data), len(rainData.Content.Tram))

	var measurements []RainStationStat
	for _, d := range rainData.Content.Data {
		if d.LuongMua_HT > 0 {
			// Extract time (usually T format)
			tBD := d.ThoiGian_BD
			if len(tBD) > 16 {
				tBD = tBD[11:16] // Just HH:mm
			}

			sessionRain := d.LuongMua_HT - d.LuongMua_BD
			if sessionRain < 0 {
				sessionRain = 0
			}

			measurements = append(measurements, RainStationStat{
				Name:        stationMap[d.TramId],
				TotalRain:   d.LuongMua_HT,
				SessionRain: sessionRain,
				StartTime:   tBD,
			})
		}
	}

	if len(measurements) == 0 {
		return &RainSummaryData{
			TotalStations: len(rainData.Content.Tram),
			RainyStations: 0,
			Measurements:  []RainStationStat{},
		}, nil
	}

	sort.Slice(measurements, func(i, j int) bool {
		return measurements[i].TotalRain > measurements[j].TotalRain
	})

	return &RainSummaryData{
		TotalStations:  len(rainData.Content.Tram),
		RainyStations:  len(measurements),
		MaxRainStation: measurements[0],
		Measurements:   measurements,
	}, nil
}

type WaterDataResponse struct {
	Code    int `json:"Code"`
	Content struct {
		Tram []struct {
			Id          string `json:"Id"`
			TenTram     string `json:"TenTram"`
			TenTramHTML string `json:"TenTramHTML"`
			Loai        string `json:"Loai"` // "1" for River, "2" for Lake
		} `json:"tram"`
		Data []struct {
			TramId       string  `json:"TramId"`
			ThuongLuu_HT float64 `json:"ThuongLuu_HT"`
			ThoiGian_HT  string  `json:"ThoiGian_HT"`
			Loai         int     `json:"Loai"`
		} `json:"data"`
	} `json:"Content"`
}

func (s *service) GetWaterSummary(ctx context.Context) (*WaterSummaryData, error) {
	url := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallmucnuoc?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	fmt.Printf(" [GoogleAPI] Calling Water API: %s\n", url)
	resp, err := http.Get(url)
	if err != nil {
		fmt.Printf(" [GoogleAPI] Water API Error: %v\n", err)
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var waterData WaterDataResponse
	if err := json.Unmarshal(bodyBytes, &waterData); err != nil {
		return nil, err
	}

	stationMap := make(map[string]struct {
		Name string
		Loai string
	})
	for _, t := range waterData.Content.Tram {
		stationMap[t.Id] = struct {
			Name string
			Loai string
		}{Name: t.TenTramHTML, Loai: t.Loai}
	}

	var lakes, rivers []WaterStationStat
	for _, d := range waterData.Content.Data {
		info, ok := stationMap[d.TramId]
		if !ok {
			continue
		}

		timeStr := d.ThoiGian_HT
		if len(timeStr) > 16 {
			timeStr = timeStr[11:16]
		}

		stat := WaterStationStat{
			Name:     info.Name,
			Level:    d.ThuongLuu_HT,
			ThoiGian: timeStr,
		}

		if info.Loai == "2" {
			stat.Label = "Hồ"
			lakes = append(lakes, stat)
		} else {
			stat.Label = "Sông"
			rivers = append(rivers, stat)
		}
	}

	return &WaterSummaryData{
		TotalStations: len(waterData.Content.Tram),
		LakeStations:  lakes,
		RiverStations: rivers,
	}, nil
}

func (s *service) GetInundationSummary(ctx context.Context) (*InundationSummaryData, error) {
	reports, _, err := s.inuSvc.ListReports(ctx, "")
	if err != nil {
		return nil, err
	}

	var ongoing []InundationPointStat
	for _, r := range reports {
		if r.Status == "active" {
			var updates []InundationUpdateStat
			if fullReport, err := s.inuSvc.GetReport(ctx, r.ID); err == nil && fullReport != nil {
				for _, u := range fullReport.Updates {
					updates = append(updates, InundationUpdateStat{
						Timestamp:   time.Unix(u.Timestamp, 0).Format("15:04 02/01/2006"),
						Description: u.Description,
						Depth:       u.Depth,
					})
				}
			}

			ongoing = append(ongoing, InundationPointStat{
				StreetName:    r.StreetName,
				Depth:         r.Depth,
				StartTime:     time.Unix(r.StartTime, 0).Format("15:04 02/01/2006"),
				Description:   r.Description,
				CurrentStatus: "Đang ngập lụt, chưa kết thúc",
				Updates:       updates,
			})
		}
	}

	return &InundationSummaryData{
		ActivePoints:  len(ongoing),
		OngoingPoints: ongoing,
	}, nil
}

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
