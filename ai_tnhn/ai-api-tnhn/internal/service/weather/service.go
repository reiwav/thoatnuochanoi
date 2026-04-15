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

type ForecastDay struct {
	Date            string  `json:"date"`
	Description     string  `json:"description"`
	TemperatureMin  float64 `json:"temperature_min"`
	TemperatureMax  float64 `json:"temperature_max"`
	RainProbability int     `json:"rain_probability"`
	RainFall        float64 `json:"rain_fall"` // in mm
}

type Service interface {
	GetRawRainData(ctx context.Context) (*RainDataResponse, error)
	GetRawWaterData(ctx context.Context) (*WaterDataResponse, error)
	GetHistoricalRainData(ctx context.Context) (HistoricalRainData, error)
	GetComparisonData(ctx context.Context, year1, year2 int) (interface{}, error)
	GetForecast(ctx context.Context) (string, error)
	GetGeminiForecast(ctx context.Context) ([]ForecastDay, error)
	SetForecastFunc(fn ForecastFunc)
}

type service struct {
	histRepo     repository.HistoricalRain
	forecastFunc ForecastFunc
	forecast     string
	lastFetch    time.Time

	geminiForecast    []ForecastDay
	lastGeminiFetch   time.Time
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
	// Caching: Only fetch once per day unless app restarts
	now := time.Now().In(vietnamTZ)
	if s.forecast != "" && s.lastFetch.In(vietnamTZ).Year() == now.Year() &&
		s.lastFetch.In(vietnamTZ).Month() == now.Month() &&
		s.lastFetch.In(vietnamTZ).Day() == now.Day() {
		return s.forecast, nil
	}

	// Fetch real weather data from Open-Meteo (Hanoi: 21.0285, 105.8542)
	meteoURL := "https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto"
	client := &http.Client{Timeout: 10 * time.Second}
	respMeteo, err := client.Get(meteoURL)
	var meteoData string
	if err == nil {
		defer respMeteo.Body.Close()
		body, _ := io.ReadAll(respMeteo.Body)
		meteoData = string(body)
	}

	if meteoData == "" {
		return "Dự báo thời tiết 3 ngày tới: Hiện không có dữ liệu thời tiết.", nil
	}

	var data struct {
		Daily struct {
			Time                        []string  `json:"time"`
			Weathercode                 []int     `json:"weathercode"`
			Temperature2mMax            []float64 `json:"temperature_2m_max"`
			Temperature2mMin            []float64 `json:"temperature_2m_min"`
			PrecipitationSum            []float64 `json:"precipitation_sum"`
			PrecipitationProbabilityMax []int     `json:"precipitation_probability_max"`
		} `json:"daily"`
	}

	if err := json.Unmarshal([]byte(meteoData), &data); err != nil {
		return "Dự báo thời tiết 3 ngày tới: Lỗi phân tích dữ liệu thời tiết.", nil
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

	result := "Dự báo thời tiết 3 ngày tới: \n"
	count := 0
	for i := 0; i < len(data.Daily.Time) && count < 3; i++ {
		t, _ := time.Parse("2006-01-02", data.Daily.Time[i])
		dateStr := t.Format("02/01")
		rainProb := 0
		if i < len(data.Daily.PrecipitationProbabilityMax) {
			rainProb = data.Daily.PrecipitationProbabilityMax[i]
		}
		rainFall := 0.0
		if i < len(data.Daily.PrecipitationSum) {
			rainFall = data.Daily.PrecipitationSum[i]
		}

		dayInfo := fmt.Sprintf("- Ngày %s: %s; Tỉ lệ mưa: %d%% (%.1fmm); Nhiệt độ: %.0f-%.0f°C",
			dateStr,
			getWeatherDesc(data.Daily.Weathercode[i]),
			rainProb,
			rainFall,
			data.Daily.Temperature2mMin[i],
			data.Daily.Temperature2mMax[i],
		)
		result += dayInfo + "\n"
		count++
	}

	s.forecast = result
	s.lastFetch = time.Now()
	return result, nil
}

func (s *service) generateManualForecast(meteoData string) string {
	if meteoData == "" {
		return "Dự báo thời tiết 3 ngày tới: Hiện không có dữ liệu thời tiết."
	}

	var data struct {
		Daily struct {
			Time                        []string  `json:"time"`
			Weathercode                 []int     `json:"weathercode"`
			Temperature2mMax            []float64 `json:"temperature_2m_max"`
			Temperature2mMin            []float64 `json:"temperature_2m_min"`
			PrecipitationProbabilityMax []int     `json:"precipitation_probability_max"`
		} `json:"daily"`
	}

	if err := json.Unmarshal([]byte(meteoData), &data); err != nil {
		return "Dự báo thời tiết 3 ngày tới: Lỗi phân tích dữ liệu thời tiết."
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

	result := "Dự báo thời tiết 3 ngày tới: \n"
	count := 0
	for i := 0; i < len(data.Daily.Time) && count < 3; i++ {
		t, _ := time.Parse("2006-01-02", data.Daily.Time[i])
		dateStr := t.Format("02/01")
		rainProb := 0
		if i < len(data.Daily.PrecipitationProbabilityMax) {
			rainProb = data.Daily.PrecipitationProbabilityMax[i]
		}
		dayInfo := fmt.Sprintf("- Ngày %s: %s; Tỉ lệ mưa: %d%%; Nhiệt độ: %.0f-%.0f°C",
			dateStr,
			getWeatherDesc(data.Daily.Weathercode[i]),
			rainProb,
			data.Daily.Temperature2mMin[i],
			data.Daily.Temperature2mMax[i],
		)
		result += dayInfo + "\n"
		count++
	}

	return result
}

func (s *service) GetGeminiForecast(ctx context.Context) ([]ForecastDay, error) {
	now := time.Now().In(vietnamTZ)
	if len(s.geminiForecast) > 0 && s.lastGeminiFetch.In(vietnamTZ).Year() == now.Year() &&
		s.lastGeminiFetch.In(vietnamTZ).Month() == now.Month() &&
		s.lastGeminiFetch.In(vietnamTZ).Day() == now.Day() {
		return s.geminiForecast, nil
	}

	// Fetch real weather data from Open-Meteo (Hanoi: 21.0285, 105.8542)
	meteoURL := "https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto"
	client := &http.Client{Timeout: 10 * time.Second}
	respMeteo, err := client.Get(meteoURL)
	var meteoData string
	if err == nil {
		defer respMeteo.Body.Close()
		body, _ := io.ReadAll(respMeteo.Body)
		meteoData = string(body)
	}

	s.geminiForecast = s.generateManualForecastJSON(meteoData)
	s.lastGeminiFetch = time.Now()
	return s.geminiForecast, nil
}

func (s *service) generateManualForecastJSON(meteoData string) []ForecastDay {
	if meteoData == "" {
		return nil
	}

	var data struct {
		Daily struct {
			Time                        []string  `json:"time"`
			Weathercode                 []int     `json:"weathercode"`
			Temperature2mMax            []float64 `json:"temperature_2m_max"`
			Temperature2mMin            []float64 `json:"temperature_2m_min"`
			PrecipitationSum            []float64 `json:"precipitation_sum"`
			PrecipitationProbabilityMax []int     `json:"precipitation_probability_max"`
		} `json:"daily"`
	}

	if err := json.Unmarshal([]byte(meteoData), &data); err != nil {
		return nil
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

	var result []ForecastDay
	for i := 0; i < len(data.Daily.Time) && i < 3; i++ {
		t, _ := time.Parse("2006-01-02", data.Daily.Time[i])
		rainProb := 0
		if i < len(data.Daily.PrecipitationProbabilityMax) {
			rainProb = data.Daily.PrecipitationProbabilityMax[i]
		}
		rainFall := 0.0
		if i < len(data.Daily.PrecipitationSum) {
			rainFall = data.Daily.PrecipitationSum[i]
		}

		result = append(result, ForecastDay{
			Date:            t.Format("02/01"),
			Description:     getWeatherDesc(data.Daily.Weathercode[i]),
			TemperatureMin:  data.Daily.Temperature2mMin[i],
			TemperatureMax:  data.Daily.Temperature2mMax[i],
			RainProbability: rainProb,
			RainFall:        rainFall,
		})
	}

	return result
}
