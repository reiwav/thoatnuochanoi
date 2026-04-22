package weather

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/integration/forecast"
	"ai-api-tnhn/internal/integration/thoatnuoc"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/utils"
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

type RainDataResponse = thoatnuoc.RainDataResponse
type WaterDataResponse = thoatnuoc.WaterDataResponse

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

type RainStationStat struct {
	Name          string    `json:"name"`
	TotalRain     float64   `json:"total_rain"`
	SessionRain   float64   `json:"session_rain"`
	StartTime     string    `json:"start_time"`
	EndTime       string    `json:"end_time"`
	StartTimeFull time.Time `json:"start_time_full"`
	EndTimeFull   time.Time `json:"end_time_full"`
	IsRaining     bool      `json:"is_raining"`
}

type RainSummaryData struct {
	TotalStations  int               `json:"total_stations"`
	RainyStations  int               `json:"rainy_stations"`
	MaxRainStation RainStationStat   `json:"max_rain_station"`
	Measurements   []RainStationStat `json:"measurements"`
	SummaryText    string            `json:"summary_text,omitempty"`
}

type Service interface {
	GetRawRainData(ctx context.Context) (*RainDataResponse, error)
	GetRawWaterData(ctx context.Context) (*WaterDataResponse, error)
	GetHistoricalRainData(ctx context.Context) (HistoricalRainData, error)
	GetComparisonData(ctx context.Context, year1, year2 int) (interface{}, error)
	GetForecast(ctx context.Context) (string, error)
	GetGeminiForecast(ctx context.Context) ([]ForecastDay, error)
	GetRainSummary(ctx context.Context, orgID string, assignedIDs []string) (*RainSummaryData, error)
	SetForecastFunc(fn ForecastFunc)
}

type service struct {
	histRepo     repository.HistoricalRain
	stationSvc   station.Service
	thoatnuocSvc thoatnuoc.Service
	forecastSvc  forecast.Service
	forecastFunc ForecastFunc
	forecast     string
	lastFetch    time.Time

	geminiForecast  []ForecastDay
	lastGeminiFetch time.Time
}

func NewService(histRepo repository.HistoricalRain, stationSvc station.Service, thoatnuocSvc thoatnuoc.Service, forecastSvc forecast.Service) Service {
	return &service{
		histRepo:     histRepo,
		stationSvc:   stationSvc,
		thoatnuocSvc: thoatnuocSvc,
		forecastSvc:  forecastSvc,
	}
}

func (s *service) GetRawRainData(ctx context.Context) (*RainDataResponse, error) {
	return s.thoatnuocSvc.GetRawRainData(ctx)
}

func (s *service) GetRawWaterData(ctx context.Context) (*WaterDataResponse, error) {
	return s.thoatnuocSvc.GetRawWaterData(ctx)
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
	now := time.Now().In(utils.VietnamTZ)
	if s.forecast != "" && s.lastFetch.In(utils.VietnamTZ).Year() == now.Year() &&
		s.lastFetch.In(utils.VietnamTZ).Month() == now.Month() &&
		s.lastFetch.In(utils.VietnamTZ).Day() == now.Day() {
		return s.forecast, nil
	}

	// Fetch real weather data from Open-Meteo
	data, err := s.forecastSvc.GetHanoiForecast(ctx)
	if err != nil || len(data.Daily.Time) == 0 {
		return "Dự báo thời tiết 3 ngày tới: Hiện không có dữ liệu thời tiết.", nil
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

func (s *service) generateManualForecast(data *forecast.ForecastResponse) string {
	if data == nil || len(data.Daily.Time) == 0 {
		return "Dự báo thời tiết 3 ngày tới: Hiện không có dữ liệu thời tiết."
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

func (s *service) getPermittedRainStations(ctx context.Context, orgID string, assignedIDs []string) (map[int]bool, error) {
	if s.stationSvc == nil {
		return nil, fmt.Errorf("stationSvc is not initialized")
	}

	f := filter.NewBasicFilter()
	if orgID != "" && orgID != "all" {
		f.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
		})
	}

	if len(assignedIDs) > 0 {
		f.AddWhere("id_in", "_id", bson.M{"$in": assignedIDs})
	}

	stations, _, err := s.stationSvc.ListRainStations(ctx, f)
	if err != nil {
		return nil, err
	}

	permitted := make(map[int]bool)
	for _, st := range stations {
		if st.OldID > 0 {
			permitted[st.OldID] = true
		}
	}
	return permitted, nil
}

func (s *service) GetRainSummary(ctx context.Context, orgID string, assignedIDs []string) (*RainSummaryData, error) {
	rainData, err := s.GetRawRainData(ctx)
	if err != nil {
		return nil, err
	}
	permitted, err := s.getPermittedRainStations(ctx, orgID, assignedIDs)
	if err != nil {
		return nil, err
	}

	stationMap := make(map[int]string)
	for _, t := range rainData.Content.Tram {
		var id int
		if v, ok := t.Id.(float64); ok {
			id = int(v)
		} else if v, ok := t.Id.(string); ok {
			fmt.Sscanf(v, "%d", &id)
		}

		if orgID != "" && orgID != "all" && !permitted[id] {
			continue // Skip stations not permitted
		}

		stationMap[id] = t.TenPhuong
	}

	now := time.Now().In(utils.VietnamTZ)
	var measurements []RainStationStat
	rainyCount := 0

	for _, d := range rainData.Content.Data {
		if d.LuongMua_HT > 0 {
			var id int
			if v, ok := d.TramId.(float64); ok {
				id = int(v)
			} else if v, ok := d.TramId.(string); ok {
				fmt.Sscanf(v, "%d", &id)
			}

			if orgID != "" && orgID != "all" && !permitted[id] {
				continue
			}

			// Parse ThoiGian_HT to check if it's currently raining (last update within 5 minutes)
			isRaining := false
			lastUpdate, err := utils.ParseTime(d.ThoiGian_HT)
			if err != nil {
				continue
			}

			diff := now.Sub(lastUpdate)
			if !lastUpdate.IsZero() && diff >= 0 && diff <= 5*time.Minute {
				isRaining = true
				rainyCount++
			}

			tBD := d.ThoiGian_BD
			if len(tBD) > 16 {
				tBD = tBD[11:16]
			}

			tHT := d.ThoiGian_HT
			if len(tHT) > 16 {
				tHT = tHT[11:16]
			}
			sessionRain := d.LuongMua_HT - d.LuongMua_BD
			if sessionRain < 0 {
				sessionRain = 0
			}
			tFullBD, err := utils.ParseTime(d.ThoiGian_BD)
			if err != nil {
				continue
			}
			tFullHT, err := utils.ParseTime(d.ThoiGian_HT)
			if err != nil {
				continue
			}

			measurements = append(measurements, RainStationStat{
				Name:          stationMap[id],
				TotalRain:     d.LuongMua_HT,
				SessionRain:   sessionRain,
				StartTime:     tBD,
				EndTime:       tHT,
				StartTimeFull: tFullBD,
				EndTimeFull:   tFullHT,
				IsRaining:     isRaining,
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
		RainyStations:  rainyCount,
		MaxRainStation: measurements[0],
		Measurements:   measurements,
	}, nil
}

func (s *service) GetGeminiForecast(ctx context.Context) ([]ForecastDay, error) {
	now := time.Now().In(utils.VietnamTZ)
	if len(s.geminiForecast) > 0 && s.lastGeminiFetch.In(utils.VietnamTZ).Year() == now.Year() &&
		s.lastGeminiFetch.In(utils.VietnamTZ).Month() == now.Month() &&
		s.lastGeminiFetch.In(utils.VietnamTZ).Day() == now.Day() {
		return s.geminiForecast, nil
	}

	// Fetch real weather data from Open-Meteo
	data, err := s.forecastSvc.GetHanoiForecast(ctx)
	if err != nil {
		return nil, nil
	}

	s.geminiForecast = s.generateManualForecastJSON(data)
	s.lastGeminiFetch = time.Now()
	return s.geminiForecast, nil
}

func (s *service) generateManualForecastJSON(data *forecast.ForecastResponse) []ForecastDay {
	if data == nil || len(data.Daily.Time) == 0 {
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
