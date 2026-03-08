package token

import (
	"context"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
)

type Service interface {
	GetByID(ctx context.Context, tokenID string) (*models.Token, error)
}

type service struct {
	tokenRepo repository.Token
}

func NewService(tokenRepo repository.Token) Service {

	return &service{
		tokenRepo: tokenRepo,
	}
}

func (t service) GetByID(ctx context.Context, tokenID string) (*models.Token, error) {
	var tk *models.Token
	return tk, t.tokenRepo.R_SelectByID(ctx, tokenID, &tk)
}
