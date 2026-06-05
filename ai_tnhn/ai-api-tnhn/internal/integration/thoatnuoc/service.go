package thoatnuoc

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/setting"
	"ai-api-tnhn/internal/utils"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/go-resty/resty/v2"
)

var ErrSessionExpired = errors.New("vrain session expired")

type RainDataResponse struct {
	Code    int `json:"Code"`
	Content struct {
		Tram []struct {
			Id        int    `json:"Id"` // Can be float64 or string from external API
			TenTram   string `json:"TenTram"`
			TenPhuong string `json:"TenPhuong"`
			DiaChi    string `json:"DiaChi"`
			Lat       string `json:"Lat"`
			Lng       string `json:"Lng"`
			ThuTu     int    `json:"ThuTu"`
			ManHinh   int    `json:"ManHinh"`
			PhuongId  int    `json:"PhuongId"`
			Active    bool   `json:"Active"`
		} `json:"tram"`
		Data []struct {
			Id          int         `json:"Id"`
			TramId      interface{} `json:"TramId"` // Can be float64 or string
			LuongMua_BD float64     `json:"LuongMua_BD"`
			ThoiGian_BD string      `json:"ThoiGian_BD"`
			LuongMua_HT float64     `json:"LuongMua_HT"`
			ThoiGian_HT string      `json:"ThoiGian_HT"`
			LuongMua_Tr float64     `json:"LuongMua_Tr"`
			ThoiGian_Tr string      `json:"ThoiGian_Tr"`
			AC          int         `json:"AC"`
		} `json:"data"`
	} `json:"Content"`
}

type WaterDataResponse struct {
	Code    int `json:"Code"`
	Content struct {
		Tram []struct {
			Id          string `json:"Id"`
			TenTram     string `json:"TenTram"`
			TenTramHTML string `json:"TenTramHTML"`
			Loai        string `json:"Loai"` // "1" for River, "2" for Lake
			ThuTu       int    `json:"ThuTu"`
		} `json:"tram"`
		Data []struct {
			TramId       string  `json:"TramId"`
			ThuongLuu_HT float64 `json:"ThuongLuu_HT"`
			ThoiGian_HT  string  `json:"ThoiGian_HT"`
			Loai         int     `json:"Loai"`
		} `json:"data"`
	} `json:"Content"`
}

type RainChartDataResponse struct {
	Data string `json:"Data"`
}

type RainChartDataPoint struct {
	ThoiGian string  `json:"ThoiGian"`
	LuongMua float64 `json:"LuongMua"`
}

type Service interface {
	GetRawRainData(ctx context.Context) (*RainDataResponse, error)
	GetRawWaterData(ctx context.Context) (*WaterDataResponse, error)
	GetRainChartData(ctx context.Context, stationOldID int, date string) ([]RainChartDataPoint, error)
	LoginAndGetSessionID(ctx context.Context) (string, error)
}

type service struct {
	client      *http.Client
	restyClient *resty.Client
	settingSvc  setting.Service
}

func NewService(settingSvc setting.Service) Service {
	httpClient := &http.Client{
		Timeout: 15 * time.Second,
	}
	return &service{
		client:      httpClient,
		restyClient: resty.NewWithClient(httpClient),
		settingSvc:  settingSvc,
	}
}

func (s *service) GetRawRainData(ctx context.Context) (*RainDataResponse, error) {
	url := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallrain?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call rain API: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var rainData RainDataResponse
	if err := json.Unmarshal(bodyBytes, &rainData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal rain data: %w", err)
	}

	// Convert UTC timestamps to Vietnam timezone (UTC+7)
	for i := range rainData.Content.Data {
		rainData.Content.Data[i].ThoiGian_BD = utils.ConvertUTCToVietnam(rainData.Content.Data[i].ThoiGian_BD)
		rainData.Content.Data[i].ThoiGian_HT = utils.ConvertUTCToVietnam(rainData.Content.Data[i].ThoiGian_HT)
		rainData.Content.Data[i].ThoiGian_Tr = utils.ConvertUTCToVietnam(rainData.Content.Data[i].ThoiGian_Tr)
	}

	return &rainData, nil
}

func (s *service) GetRawWaterData(ctx context.Context) (*WaterDataResponse, error) {
	url := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallmucnuoc?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call water API: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var waterData WaterDataResponse
	if err := json.Unmarshal(bodyBytes, &waterData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal water data: %w", err)
	}

	return &waterData, nil
}

func (s *service) GetRainChartData(ctx context.Context, stationOldID int, date string) ([]RainChartDataPoint, error) {
	st, err := s.settingSvc.GetRainSetting(ctx)
	if err != nil {
		return nil, err
	}

	dataPoints, err := s.getRainChartDataRaw(ctx, st.SessionID, stationOldID, date)
	if err != nil && errors.Is(err, ErrSessionExpired) {
		fmt.Printf("Vrain Session ID %s expired. Performing auto-login...\n", st.SessionID)
		newSessionID, loginErr := s.LoginAndGetSessionID(ctx)
		if loginErr == nil && newSessionID != "" {
			_ = s.settingSvc.UpdateRainSetting(ctx, &models.RainSetting{SessionID: newSessionID})
			dataPoints, err = s.getRainChartDataRaw(ctx, newSessionID, stationOldID, date)
		} else if loginErr != nil {
			fmt.Printf("Vrain auto-login failed: %v\n", loginErr)
		}
	}
	return dataPoints, err
}

func (s *service) getRainChartDataRaw(ctx context.Context, sessionID string, stationOldID int, date string) ([]RainChartDataPoint, error) {
	url := fmt.Sprintf("https://thoatnuochanoi.vn/qlnl/Contains/ajax/phai.ashx?type=solieumua&tram=%d&ngay=%s", stationOldID, date)

	resp, err := s.restyClient.R().
		SetContext(ctx).
		SetHeaders(map[string]string{
			"Accept":           "application/json, text/javascript, */*; q=0.01",
			"Accept-Language":  "vi-VN,vi;q=0.9",
			"Cache-Control":    "no-cache",
			"Connection":       "keep-alive",
			"Content-Type":     "application/json; charset=utf-8",
			"Cookie":           "ASP.NET_SessionId=" + sessionID,
			"Pragma":           "no-cache",
			"Referer":          "https://thoatnuochanoi.vn/qlnl/bieu-do-mua",
			"X-Requested-With": "XMLHttpRequest",
			"User-Agent":       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		}).
		Get(url)

	if err != nil {
		return nil, fmt.Errorf("failed to call rain chart API: %w", err)
	}

	body := resp.Body()
	bodyStr := strings.TrimSpace(string(body))
	fmt.Println("====== StationID", stationOldID, sessionID, "==== data", bodyStr)

	if bodyStr == "{}" {
		return nil, ErrSessionExpired
	}
	if bodyStr == `{"Data":"[]"}` {
		return nil, nil
	}

	var apiResponse RainChartDataResponse
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		return nil, ErrSessionExpired
	}

	var dataPoints []RainChartDataPoint
	if err := json.Unmarshal([]byte(apiResponse.Data), &dataPoints); err != nil {
		return nil, ErrSessionExpired
	}

	return dataPoints, nil
}

func extractValue(html, fieldName string) string {
	// Match pattern: name="fieldName" ... value="val"
	re := regexp.MustCompile(fmt.Sprintf(`name="%s"[^>]*value="([^"]*)"`, regexp.QuoteMeta(fieldName)))
	matches := re.FindStringSubmatch(html)
	if len(matches) > 1 {
		return matches[1]
	}
	// Match pattern: value="val" ... name="fieldName"
	reAlt := regexp.MustCompile(fmt.Sprintf(`value="([^"]*)"[^>]*name="%s"`, regexp.QuoteMeta(fieldName)))
	matchesAlt := reAlt.FindStringSubmatch(html)
	if len(matchesAlt) > 1 {
		return matchesAlt[1]
	}
	return ""
}

func (s *service) LoginAndGetSessionID(ctx context.Context) (string, error) {
	loginURL := "https://thoatnuochanoi.vn/qlnl/dang-nhap"
	username := "admin"
	password := "Hsdc@1234"

	jar, err := cookiejar.New(nil)
	if err != nil {
		return "", fmt.Errorf("failed to create cookiejar: %w", err)
	}

	client := &http.Client{
		Jar:     jar,
		Timeout: 20 * time.Second,
	}

	req, err := http.NewRequestWithContext(ctx, "GET", loginURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create GET request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send GET request: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read GET response: %w", err)
	}
	htmlContent := string(bodyBytes)

	// Extract ASP.NET parameters
	viewState := extractValue(htmlContent, "__VIEWSTATE")
	viewStateGen := extractValue(htmlContent, "__VIEWSTATEGENERATOR")
	eventValidation := extractValue(htmlContent, "__EVENTVALIDATION")

	if viewState == "" || eventValidation == "" {
		return "", fmt.Errorf("required ASP.NET viewstate variables not found in login page")
	}

	formData := url.Values{}
	formData.Set("__VIEWSTATE", viewState)
	formData.Set("__VIEWSTATEGENERATOR", viewStateGen)
	formData.Set("__EVENTVALIDATION", eventValidation)
	formData.Set("txtUser", username)
	formData.Set("txtPassword", password)
	formData.Set("btnDangNhap", "Đăng nhập")

	postReq, err := http.NewRequestWithContext(ctx, "POST", loginURL, strings.NewReader(formData.Encode()))
	if err != nil {
		return "", fmt.Errorf("failed to create POST request: %w", err)
	}
	postReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	postReq.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	postReq.Header.Set("Referer", loginURL)

	postResp, err := client.Do(postReq)
	if err != nil {
		return "", fmt.Errorf("failed to send POST request: %w", err)
	}
	defer postResp.Body.Close()

	// Parse cookie from jar
	parsedURL, _ := url.Parse("https://thoatnuochanoi.vn")
	var sessionID string
	for _, cookie := range jar.Cookies(parsedURL) {
		if cookie.Name == "ASP.NET_SessionId" {
			sessionID = cookie.Value
			break
		}
	}

	if sessionID == "" {
		qlnlURL, _ := url.Parse(loginURL)
		for _, cookie := range jar.Cookies(qlnlURL) {
			if cookie.Name == "ASP.NET_SessionId" {
				sessionID = cookie.Value
				break
			}
		}
	}

	if sessionID == "" {
		return "", fmt.Errorf("ASP.NET_SessionId cookie not found in response jar")
	}

	return sessionID, nil
}

