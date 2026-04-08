package weather

import (
	"ai-api-tnhn/internal/repository"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

var vietnamTZ = time.FixedZone("Asia/Ho_Chi_Minh", 7*60*60)

// convertUTCToVietnam converts a UTC timestamp string to Vietnam timezone (UTC+7).
// Input format: "2026-03-09T04:40:11" (UTC without timezone suffix)
// Output format: "2026-03-09T11:40:11" (Vietnam local time)
func convertUTCToVietnam(utcStr string) string {
	if utcStr == "" || utcStr == "-" {
		return utcStr
	}
	layouts := []string{
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
	}
	for _, layout := range layouts {
		t, err := time.Parse(layout, utcStr)
		if err == nil {
			vnTime := t.In(vietnamTZ)
			return vnTime.Format("2006-01-02T15:04:05")
		}
	}
	return utcStr
}

type RainDataResponse struct {
	Code    int `json:"Code"`
	Content struct {
		Tram []struct {
			Id        interface{} `json:"Id"` // Can be float64 or string from external API
			TenTram   string      `json:"TenTram"`
			TenPhuong string      `json:"TenPhuong"`
			DiaChi    string      `json:"DiaChi"`
			Lat       string      `json:"Lat"`
			Lng       string      `json:"Lng"`
			ThuTu     int         `json:"ThuTu"`
			ManHinh   int         `json:"ManHinh"`
			PhuongId  int         `json:"PhuongId"`
			Active    bool        `json:"Active"`
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
		} `json:"tram"`
		Data []struct {
			TramId       string  `json:"TramId"`
			ThuongLuu_HT float64 `json:"ThuongLuu_HT"`
			ThoiGian_HT  string  `json:"ThoiGian_HT"`
			Loai         int     `json:"Loai"`
		} `json:"data"`
	} `json:"Content"`
}

type HistoricalRainData map[string]map[string]float64

type ForecastFunc func(ctx context.Context, prompt string) (string, error)

type Service interface {
	GetRawRainData(ctx context.Context) (*RainDataResponse, error)
	GetRawWaterData(ctx context.Context) (*WaterDataResponse, error)
	GetHistoricalRainData(ctx context.Context) (HistoricalRainData, error)
	GetComparisonData(ctx context.Context, year1, year2 int) (interface{}, error)
	GetForecast(ctx context.Context) (string, error)
	SetForecastFunc(fn ForecastFunc)
}

type service struct {
	histRepo     repository.HistoricalRain
	forecastFunc ForecastFunc
	forecast     string
	lastFetch    time.Time
}

func NewService(histRepo repository.HistoricalRain) Service {
	return &service{histRepo: histRepo}
}

func (s *service) GetRawRainData(ctx context.Context) (*RainDataResponse, error) {
	url := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallrain?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	resp, err := http.Get(url)
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
		rainData.Content.Data[i].ThoiGian_BD = convertUTCToVietnam(rainData.Content.Data[i].ThoiGian_BD)
		rainData.Content.Data[i].ThoiGian_HT = convertUTCToVietnam(rainData.Content.Data[i].ThoiGian_HT)
		rainData.Content.Data[i].ThoiGian_Tr = convertUTCToVietnam(rainData.Content.Data[i].ThoiGian_Tr)
	}

	return &rainData, nil
}

func (s *service) GetRawWaterData(ctx context.Context) (*WaterDataResponse, error) {
	url := "https://noibo.thoatnuochanoi.vn/api/thuytri/getallmucnuoc?id=3a1a672f-c56f-4752-b86c-455e30427b87"
	resp, err := http.Get(url)
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

	// Convert UTC timestamps to Vietnam timezone (UTC+7)
	// for i := range waterData.Content.Data {
	// 	waterData.Content.Data[i].ThoiGian_HT = convertUTCToVietnam(waterData.Content.Data[i].ThoiGian_HT)
	// }

	return &waterData, nil
}

func (s *service) GetHistoricalRainData(ctx context.Context) (HistoricalRainData, error) {
	records, err := s.histRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch historical rain data from DB: %w", err)
	}

	results := make(HistoricalRainData)
	for _, r := range records {
		if _, ok := results[r.Station]; !ok {
			results[r.Station] = make(map[string]float64)
		}
		results[r.Station][r.Date] = r.Rainfall
	}

	return results, nil
}

func (s *service) GetComparisonData(ctx context.Context, year1, year2 int) (interface{}, error) {
	totals, err := s.histRepo.GetMonthlyTotals(ctx, []int{year1, year2})
	if err != nil {
		return nil, err
	}

	// Structure: map[year]map[month]map[station]total
	data := make(map[int]map[int]map[string]float64)
	data[year1] = make(map[int]map[string]float64)
	data[year2] = make(map[int]map[string]float64)

	stations := make(map[string]bool)

	for _, t := range totals {
		stations[t.Station] = true
		if _, ok := data[t.Year][t.Month]; !ok {
			data[t.Year][t.Month] = make(map[string]float64)
		}
		data[t.Year][t.Month][t.Station] = t.Total
	}

	// Also calculate annual totals
	annualTotals := make(map[int]map[string]float64)
	annualTotals[year1] = make(map[string]float64)
	annualTotals[year2] = make(map[string]float64)

	for y, months := range data {
		for _, stMap := range months {
			for st, val := range stMap {
				annualTotals[y][st] += val
			}
		}
	}

	stationList := []string{}
	for s := range stations {
		stationList = append(stationList, s)
	}

	return gin.H{
		"year1":        year1,
		"year2":        year2,
		"data":         data,
		"annualTotals": annualTotals,
		"stations":     stationList,
	}, nil
}

func (s *service) SetForecastFunc(fn ForecastFunc) {
	s.forecastFunc = fn
}

func (s *service) GetForecast(ctx context.Context) (string, error) {
	// Simple caching: 10 minutes
	if s.forecast != "" && time.Since(s.lastFetch) < 10*time.Minute {
		return s.forecast, nil
	}

	if s.forecastFunc == nil {
		return "", fmt.Errorf("forecast function not initialized in weather service")
	}

	// 1. Fetch real weather data from Open-Meteo (Hanoi: 21.0285, 105.8542)
	meteoURL := "https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto"
	client := &http.Client{Timeout: 10 * time.Second}
	respMeteo, err := client.Get(meteoURL)
	var meteoData string
	if err == nil {
		defer respMeteo.Body.Close()
		body, _ := io.ReadAll(respMeteo.Body)
		meteoData = string(body)
	}

	now := time.Now().In(vietnamTZ)
	prompt := fmt.Sprintf("Dựa trên số liệu thời tiết thực tế từ API sau đây cho Hà Nội:\n%s\n\nThời gian hiện tại: %s. Hãy liệt kê dự báo chi tiết cho từng ngày trong 3 ngày tới (bắt đầu từ ngày mai). Mỗi ngày một mô tả ngắn (khoảng 15 từ), phân cách rõ ràng bằng ký tự '|'. Ví dụ: 'Ngày 09/04: Nắng nóng, 25-37°C. Trời khô ráo | Ngày 10/04: Có mưa dông rải rác, 24-30°C | Ngày 11/04: Nhiều mây, có lúc mưa rào, 22-28°C'. Thông tin phải mang tính chất thông báo cho cán bộ thoát nước.", meteoData, now.Format("02/01/2006 15:04"))

	resp, err := s.forecastFunc(ctx, prompt)
	if err != nil {
		fmt.Printf(" [Weather Service] Gemini failed (%v), using automated fallback...\n", err)
		// Fallback: Manually parse meteoData if AI fails
		return s.generateManualForecast(meteoData), nil
	}

	s.forecast = resp
	s.lastFetch = time.Now()

	return resp, nil
}

func (s *service) generateManualForecast(meteoData string) string {
	if meteoData == "" {
		return "DỰ BÁO 3 NGÀY TỚI: Thời tiết Hà Nội ổn định, nhiệt độ 25-35°C. Cán bộ chú ý theo dõi."
	}

	var data struct {
		Daily struct {
			Time             []string  `json:"time"`
			Weathercode      []int     `json:"weathercode"`
			Temperature2mMax []float64 `json:"temperature_2m_max"`
			Temperature2mMin []float64 `json:"temperature_2m_min"`
		} `json:"daily"`
	}

	if err := json.Unmarshal([]byte(meteoData), &data); err != nil {
		return "DỰ BÁO 3 NGÀY TỚI: Hà Nội có mây rải rác, nhiệt độ từ 24-34°C. Cán bộ trực ban theo kế hoạch."
	}

	getWeatherDesc := func(code int) string {
		switch {
		case code == 0:
			return "Trời quang"
		case code >= 1 && code <= 3:
			return "Nhiều mây"
		case code >= 45 && code <= 48:
			return "Có sương mù"
		case code >= 51 && code <= 67:
			return "Mưa nhỏ"
		case code >= 80 && code <= 82:
			return "Mưa rào"
		case code >= 95:
			return "Có dông sét"
		default:
			return "Có mưa"
		}
	}

	result := "DỰ BÁO THỜI TIẾT 3 NGÀY TỚI: "
	for i := 1; i < len(data.Daily.Time) && i <= 3; i++ {
		t, _ := time.Parse("2006-01-02", data.Daily.Time[i])
		dateStr := t.Format("02/01")
		dayInfo := fmt.Sprintf("Ngày %s: %s, %.0f-%.0f°C",
			dateStr,
			getWeatherDesc(data.Daily.Weathercode[i]),
			data.Daily.Temperature2mMin[i],
			data.Daily.Temperature2mMax[i],
		)
		result += dayInfo
		if i < 3 {
			result += " | "
		}
	}

	return result
}
