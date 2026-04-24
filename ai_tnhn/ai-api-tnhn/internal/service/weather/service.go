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
	"strings"
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
	RainFall        float64 `json:"rain_fall"`
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
	IntensityLabel string            `json:"intensity_label"`
	SpreadLabel    string            `json:"spread_label"`
	StartTimeFull  time.Time         `json:"start_time_full"`
	EndTimeFull    time.Time         `json:"end_time_full"`
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
	histRepo repository.HistoricalRain; stationSvc station.Service; thoatnuocSvc thoatnuoc.Service; forecastSvc forecast.Service
	forecastFunc ForecastFunc; forecast string; lastFetch time.Time; geminiForecast []ForecastDay; lastGeminiFetch time.Time
}

func NewService(h repository.HistoricalRain, s station.Service, t thoatnuoc.Service, f forecast.Service) Service {
	return &service{histRepo: h, stationSvc: s, thoatnuocSvc: t, forecastSvc: f}
}

func (s *service) GetRawRainData(ctx context.Context) (*RainDataResponse, error) { return s.thoatnuocSvc.GetRawRainData(ctx) }
func (s *service) GetRawWaterData(ctx context.Context) (*WaterDataResponse, error) { return s.thoatnuocSvc.GetRawWaterData(ctx) }
func (s *service) SetForecastFunc(fn ForecastFunc) { s.forecastFunc = fn }

func (s *service) GetHistoricalRainData(ctx context.Context) (HistoricalRainData, error) {
	records, err := s.histRepo.FindAll(ctx)
	if err != nil { return nil, err }
	res := make(HistoricalRainData)
	for _, r := range records {
		if _, ok := res[r.Station]; !ok { res[r.Station] = make(map[string]float64) }
		res[r.Station][r.Date] = r.Rainfall
	}
	return res, nil
}

func (s *service) GetComparisonData(ctx context.Context, y1, y2 int) (interface{}, error) {
	totals, err := s.histRepo.GetMonthlyTotals(ctx, []int{y1, y2})
	if err != nil { return nil, err }
	data, stations := make(map[int]map[int]map[string]float64), make(map[string]bool)
	data[y1], data[y2] = make(map[int]map[string]float64), make(map[int]map[string]float64)
	for _, t := range totals {
		stations[t.Station] = true
		if _, ok := data[t.Year][t.Month]; !ok { data[t.Year][t.Month] = make(map[string]float64) }
		data[t.Year][t.Month][t.Station] = t.Total
	}
	annual := make(map[int]map[string]float64)
	annual[y1], annual[y2] = make(map[string]float64), make(map[string]float64)
	for y, ms := range data {
		for _, stM := range ms {
			for st, v := range stM { annual[y][st] += v }
		}
	}
	sList := []string{}; for s := range stations { sList = append(sList, s) }
	return gin.H{"year1": y1, "year2": y2, "data": data, "annualTotals": annual, "stations": sList}, nil
}

func (s *service) GetForecast(ctx context.Context) (string, error) {
	now := time.Now().In(utils.VietnamTZ)
	if s.forecast != "" && s.lastFetch.Year() == now.Year() && s.lastFetch.Day() == now.Day() { return s.forecast, nil }
	data, err := s.forecastSvc.GetHanoiForecast(ctx)
	if err != nil { return "Dự báo thời tiết 3 ngày tới: Hiện không có dữ liệu.", nil }
	res := "Dự báo thời tiết 3 ngày tới: \n"
	for i := 0; i < len(data.Daily.Time) && i < 3; i++ {
		t, _ := time.Parse("2006-01-02", data.Daily.Time[i])
		res += fmt.Sprintf("- Ngày %s: %s; Tỉ lệ mưa: %d%% (%.1fmm); Nhiệt độ: %.0f-%.0f°C\n",
			t.Format("02/01"), s.getWDesc(data.Daily.Weathercode[i]), data.Daily.PrecipitationProbabilityMax[i],
			data.Daily.PrecipitationSum[i], data.Daily.Temperature2mMin[i], data.Daily.Temperature2mMax[i])
	}
	s.forecast, s.lastFetch = res, now
	return res, nil
}

func (s *service) GetGeminiForecast(ctx context.Context) ([]ForecastDay, error) {
	now := time.Now().In(utils.VietnamTZ)
	if len(s.geminiForecast) > 0 && s.lastGeminiFetch.Day() == now.Day() { return s.geminiForecast, nil }
	data, err := s.forecastSvc.GetHanoiForecast(ctx)
	if err != nil { return nil, nil }
	var res []ForecastDay
	for i := 0; i < len(data.Daily.Time) && i < 3; i++ {
		t, _ := time.Parse("2006-01-02", data.Daily.Time[i])
		res = append(res, ForecastDay{
			Date: t.Format("02/01"), Description: s.getWDesc(data.Daily.Weathercode[i]),
			TemperatureMin: data.Daily.Temperature2mMin[i], TemperatureMax: data.Daily.Temperature2mMax[i],
			RainProbability: data.Daily.PrecipitationProbabilityMax[i], RainFall: data.Daily.PrecipitationSum[i],
		})
	}
	s.geminiForecast, s.lastGeminiFetch = res, now
	return res, nil
}

func (s *service) getWDesc(c int) string {
	switch {
	case c == 0: return "Trời quang"
	case c <= 3: return "Nhiều mây"
	case c <= 48: return "Có sương mù"
	case c <= 67: return "Mưa nhỏ"
	case c <= 82: return "Mưa rào"
	default: return "Có dông sét"
	}
}

func (s *service) GetRainSummary(ctx context.Context, orgID string, assignedIDs []string) (*RainSummaryData, error) {
	rainData, err := s.GetRawRainData(ctx)
	if err != nil { return nil, err }
	f := filter.NewBasicFilter()
	if orgID != "" { f.AddWhere("org", "$or", []bson.M{{"org_id": orgID}, {"shared_org_ids": orgID}}) }
	if len(assignedIDs) > 0 { f.AddWhere("id", "_id", bson.M{"$in": assignedIDs}) }
	stations, _, _ := s.stationSvc.ListRainStations(ctx, f)
	permitted := make(map[int]string)
	for _, st := range stations { if st.OldID > 0 { permitted[st.OldID] = st.TenPhuong } }

	now, rainyCount, measurements := time.Now().In(utils.VietnamTZ), 0, []RainStationStat{}
	for _, d := range rainData.Content.Data {
		var id int; fmt.Sscanf(fmt.Sprintf("%v", d.TramId), "%d", &id)
		if (orgID != "" && permitted[id] == "") || d.LuongMua_HT == 0 { continue }
		tFullBD, _ := utils.ParseTime(d.ThoiGian_BD); tFullHT, _ := utils.ParseTime(d.ThoiGian_HT)
		isRaining := false; diff := now.Sub(tFullHT)
		if !tFullHT.IsZero() && diff >= 0 && diff <= 5*time.Minute { isRaining = true; rainyCount++ }
		tBD, tHT := d.ThoiGian_BD, d.ThoiGian_HT
		if len(tBD) > 16 { tBD = tBD[11:16] }; if len(tHT) > 16 { tHT = tHT[11:16] }
		sessionRain := d.LuongMua_HT - d.LuongMua_BD; if sessionRain < 0 { sessionRain = 0 }
		measurements = append(measurements, RainStationStat{
			Name: permitted[id], TotalRain: d.LuongMua_HT, SessionRain: sessionRain,
			StartTime: tBD, EndTime: tHT, StartTimeFull: tFullBD, EndTimeFull: tFullHT, IsRaining: isRaining,
		})
	}
	if len(measurements) == 0 { return &RainSummaryData{TotalStations: len(rainData.Content.Tram)}, nil }
	sort.Slice(measurements, func(i, j int) bool { return measurements[i].TotalRain > measurements[j].TotalRain })
	intensity, spread := "nhỏ", "diện hẹp"
	if measurements[0].TotalRain > 100 { intensity = "rất lớn" } else if measurements[0].TotalRain > 50 { intensity = "lớn" }
	if rainyCount > 20 { spread = "diện rộng" }
	var minS, maxE time.Time
	for _, m := range measurements {
		if !m.StartTimeFull.IsZero() && (minS.IsZero() || m.StartTimeFull.Before(minS)) { minS = m.StartTimeFull }
		if !m.EndTimeFull.IsZero() && (maxE.IsZero() || m.EndTimeFull.After(maxE)) { maxE = m.EndTimeFull }
	}
	sumText := "Hiện tại thành phố không mưa."
	if len(measurements) > 0 {
		sumText = fmt.Sprintf("Hiện tại thành phố đang mưa %s %s. Lượng mưa:\n", spread, intensity)
		lines := []string{}; for _, m := range measurements {
			st := "Đang mưa"; if !m.IsRaining { st = "Tạnh lúc " + m.EndTime }
			lines = append(lines, fmt.Sprintf("- %s: %.1fmm (%s)", m.Name, m.TotalRain, st))
		}
		sumText += strings.Join(lines, "\n")
	}
	return &RainSummaryData{
		TotalStations: len(rainData.Content.Tram), RainyStations: rainyCount, MaxRainStation: measurements[0],
		Measurements: measurements, IntensityLabel: intensity, SpreadLabel: spread,
		StartTimeFull: minS, EndTimeFull: maxE, SummaryText: sumText,
	}, nil
}
