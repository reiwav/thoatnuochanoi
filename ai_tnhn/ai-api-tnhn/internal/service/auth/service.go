package auth

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/utils/hash"
	"ai-api-tnhn/utils/web"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
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
}

func NewService(tokenRepo repository.Token, userRepo repository.User) Service {
	userRepo.Create(context.Background(), &models.User{
		Name:     "Long Tran",
		Username: "admin23@gmail.com",
		Email:    "admin23@gmail.com",
		Password: hash.NewPassword("vietnam@"),
		Role:     constant.ROLE_SUPER_ADMIN,
	})
	userRepo.Create(context.Background(), &models.User{
		Name:     "Nam Nguyen",
		Username: "namnguyenminh8686@gmail.com",
		Email:    "namnguyenminh8686@gmail.com",
		Password: hash.NewPassword("vietnam@"),
		Role:     constant.ROLE_SUPER_ADMIN,
	})
	return &service{
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
	}
}

func (t service) GetByID(ctx context.Context, tokenID string) (*models.Token, error) {
	var tk *models.Token
	return tk, t.tokenRepo.R_SelectByID(ctx, tokenID, &tk)
}

func (t service) GetProfile(ctx context.Context, tokenID string) (*models.User, error) {
	var tk *models.Token
	err := t.tokenRepo.R_SelectByID(ctx, tokenID, &tk)
	if err != nil {
		return nil, err
	}
	user, err := t.userRepo.GetByID(ctx, tk.UserID)
	if err != nil {
		return nil, err
	}
	// Normalize known role typos from legacy data
	if user.Role == "supper_admib" || user.Role == "supper_admin" || user.Role == "super_admin " {
		user.Role = constant.ROLE_SUPER_ADMIN
	}
	return user, nil
}

func (t service) Logout(ctx context.Context, tokenID string) error {
	err := t.tokenRepo.R_DeleteByID(ctx, tokenID)
	return err
}

func (t service) Login(ctx context.Context, input LoginRequest) (*models.Token, error) {
	var u *models.User
	err := t.userRepo.R_SelectOne(ctx, bson.M{
		"email": input.Email}, &u)
	if err != nil {
		return nil, web.BadRequest("invalid email or password")
	}

	if !u.Active {
		return nil, web.BadRequest("account is disabled")
	}

	// 2. Verify password
	if err := u.Password.ComparePassword(input.Password); err != nil {
		return nil, web.BadRequest("invalid email or password ")
	}

	// 3. Tạo token
	tk := &models.Token{
		UserID: u.ID,
		Name:   u.Name,
		OrgID:  u.OrgID,
		Role:   u.Role,
	}
	err = t.tokenRepo.R_Create(ctx, tk)

	return tk, err
}

func (t service) UpdateProfile(ctx context.Context, tokenID string, input UpdateProfileRequest) error {
	user, err := t.GetProfile(ctx, tokenID)
	if err != nil {
		return err
	}

	user.Name = input.Name
	return t.userRepo.R_Update(ctx, user)
}

func (t service) ChangePassword(ctx context.Context, tokenID string, input ChangePasswordRequest) error {
	if input.NewPassword != input.ConfirmPassword {
		return web.BadRequest("New password and confirm password do not match")
	}

	user, err := t.GetProfile(ctx, tokenID)
	if err != nil {
		return err
	}

	// 1. Verify old password
	if err := user.Password.ComparePassword(input.OldPassword); err != nil {
		return web.BadRequest("Incorrect old password")
	}

	// 2. Hash new password
	str, _ := hash.Password(input.NewPassword).GererateHashedPassword()
	user.Password = hash.NewPassword(str)

	return t.userRepo.R_Update(ctx, user)
}

func (t service) OAuthLogin(ctx context.Context, email string) (*models.Token, error) {
	fmt.Println("======= email ========: ", email)
	users, total, err := t.userRepo.List(ctx, filter.NewBasicFilter())
	b, _ := json.Marshal(users)
	fmt.Println("======= users ========: ", string(b))
	fmt.Println("======= total ========: ", total)
	fmt.Println("======= err ========: ", err)
	var u *models.User
	err = t.userRepo.R_SelectOne(ctx, bson.M{"email": email}, &u)
	if err != nil {
		return nil, web.BadRequest("Employee not found with email: " + email)
	}

	// if u.Role != constant.ROLE_EMPLOYEE {
	// 	return nil, web.BadRequest("Only employees can login via Google OAuth")
	// }

	if !u.Active {
		return nil, web.BadRequest("Account is disabled")
	}

	// Create system token
	tk := &models.Token{
		UserID: u.ID,
		Name:   u.Name,
		OrgID:  u.OrgID,
		Role:   u.Role,
	}
	err = t.tokenRepo.R_Create(ctx, tk)

	return tk, err
}

func GenerateJWT(userID string, expire time.Duration, secret string) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(expire).Unix(),
		"iat": time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
