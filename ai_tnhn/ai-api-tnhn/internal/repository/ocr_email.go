package repository

import (
	"ai-api-tnhn/internal/models"
	"context"
)

type OCREmail interface {
	GetLatest(ctx context.Context) (*models.OCREmailRecord, error)
	Save(ctx context.Context, record *models.OCREmailRecord) error
}
