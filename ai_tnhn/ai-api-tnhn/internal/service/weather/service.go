package weather

import (
	"ai-api-tnhn/internal/integration/forecast"
	"ai-api-tnhn/internal/integration/thoatnuoc"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/station"
	"context"
	"time"
)

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
	histRepo       repository.HistoricalRain
	stationSvc     station.Service
	thoatnuocSvc   thoatnuoc.Service
	forecastSvc    forecast.Service
	forecastFunc   ForecastFunc
	forecast       string
	lastFetch      time.Time
	geminiForecast []ForecastDay
	lastGeminiFetch time.Time
}

func NewService(h repository.HistoricalRain, s station.Service, t thoatnuoc.Service, f forecast.Service) Service {
	return &service{histRepo: h, stationSvc: s, thoatnuocSvc: t, forecastSvc: f}
}
