package weather

import (
	"ai-api-tnhn/internal/integration/forecast"
	"ai-api-tnhn/internal/integration/thoatnuoc"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station"
	"context"
	"time"
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
