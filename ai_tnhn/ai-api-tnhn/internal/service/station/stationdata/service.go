package stationdata

import (
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/station/water"
	"context"
)

type Service interface {
	GetSystemOverview(ctx context.Context) (*SystemOverview, error)
	GetStationsByType(ctx context.Context, stationType string) (interface{}, error)
	GetRainAnalytics(ctx context.Context, stationID int64, year int, month int, startDate, endDate string, groupBy string) (interface{}, error)
	GetCoveredWards(ctx context.Context) ([]string, error)
	GetRainSummaryByWard(ctx context.Context, year int, month int, startDate, endDate string) (interface{}, error)
}

type service struct {
	stationSvc station.Service
	waterSvc   water.Service
}

func NewService(stationSvc station.Service, waterSvc water.Service) Service {
	return &service{
		stationSvc: stationSvc,
		waterSvc:   waterSvc,
	}
}
