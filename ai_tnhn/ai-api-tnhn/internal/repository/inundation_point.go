package repository

import (
	"ai-api-tnhn/internal/models"
	"context"
)

type InundationPoint interface {
	ListByOrg(ctx context.Context, orgID string) ([]models.InundationPoint, error)
	GetByID(ctx context.Context, id string) (*models.InundationPoint, error)
	Create(ctx context.Context, point models.InundationPoint) (string, error)
	Update(ctx context.Context, point models.InundationPoint) error
	Delete(ctx context.Context, id string) error
}
