package token

import (
	"ai-api-tnhn/internal/models"
	"context"
)

func (t *service) GetByID(ctx context.Context, tokenID string) (*models.Token, error) {
	var tk *models.Token
	return tk, t.tokenRepo.R_SelectByID(ctx, tokenID, &tk)
}
