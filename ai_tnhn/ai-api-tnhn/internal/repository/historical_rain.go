package repository

import (
	"ai-api-tnhn/internal/models"
	"context"
)

type HistoricalRain interface {
	FindAll(ctx context.Context) ([]*models.HistoricalRainRecord, error)
	GetMonthlyTotals(ctx context.Context, years []int) ([]*models.MonthlyTotal, error)
}
