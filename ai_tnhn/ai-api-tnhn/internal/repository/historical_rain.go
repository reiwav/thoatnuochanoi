package repository

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/models"
	"context"
)

type HistoricalRain interface {
	mgo.BaseTable
	FindAll(ctx context.Context) ([]*models.HistoricalRainRecord, error)
	GetMonthlyTotals(ctx context.Context, years []int) ([]*models.MonthlyTotal, error)
}
