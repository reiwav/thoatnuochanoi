package googleapi

import (
	"ai-api-tnhn/internal/service/google/email"
	"ai-api-tnhn/internal/service/station/inundation"
	pumpingstation "ai-api-tnhn/internal/service/station/pumping_station"
	"ai-api-tnhn/internal/service/station/water"
	"ai-api-tnhn/internal/service/weather"
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
