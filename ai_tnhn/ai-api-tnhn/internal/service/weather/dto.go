package weather

import (
	"ai-api-tnhn/internal/integration/thoatnuoc"
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
