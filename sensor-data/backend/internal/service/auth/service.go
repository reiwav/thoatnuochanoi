package auth

import (
	"context"
	"sensor-backend/internal/models"
	"sensor-backend/internal/repository"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
}

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type Service interface {
	Login(ctx context.Context, req LoginRequest) (*LoginResponse, error)
	SeedAdmin(ctx context.Context) error
}

type service struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

func NewService(userRepo repository.UserRepository, jwtSecret string) Service {
	return &service{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

func (s *service) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	user, err := s.userRepo.FindByName(ctx, req.Username)
	if err != nil {
		return nil, err
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, err
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token:    tokenString,
		Username: user.Username,
	}, nil
}

func (s *service) SeedAdmin(ctx context.Context) error {
	_, err := s.userRepo.FindByName(ctx, "admin")
	if err != nil {
		// Not found, seed it
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
		return s.userRepo.Insert(ctx, &models.User{
			Username: "admin",
			Password: string(hashedPassword),
		})
	}
	return nil
}
