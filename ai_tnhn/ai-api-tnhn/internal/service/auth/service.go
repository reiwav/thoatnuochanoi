package auth

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

type Service interface {
	GetByID(ctx context.Context, tokenID string) (*models.Token, error)
	Login(ctx context.Context, input LoginRequest) (*models.Token, error)
	GetProfile(ctx context.Context, tokenID string) (*models.User, error)
	Logout(ctx context.Context, tokenID string) error
	UpdateProfile(ctx context.Context, tokenID string, input UpdateProfileRequest) error
	ChangePassword(ctx context.Context, tokenID string, input ChangePasswordRequest) error
	OAuthLogin(ctx context.Context, email string) (*models.Token, error)
}

type service struct {
	tokenRepo repository.Token
	userRepo  repository.User
	roleRepo  repository.Role
}

func NewService(tokenRepo repository.Token, userRepo repository.User, roleRepo repository.Role) Service {
	return &service{
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
		roleRepo:  roleRepo,
	}
}
