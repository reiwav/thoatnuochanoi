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
	roleRepo  repository.Role
}

func NewService(tokenRepo repository.Token, userRepo repository.User, roleRepo repository.Role) Service {
	// ... (Create calls for admin users)
	return &service{
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
		roleRepo:  roleRepo,
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

	// Fetch is_employee and is_company from Role
	if roleData, err := t.roleRepo.GetByCode(ctx, user.Role); err == nil && roleData != nil {
		user.IsEmployee = roleData.IsEmployee
		user.IsCompany = roleData.IsCompany
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

	// 3. Get Role Data
	isEmployee := false
	isCompany := false
	roleData, err := t.roleRepo.GetByCode(ctx, u.Role)
	if err != nil {
		return nil, web.BadRequest("Role not found")
	}
	isEmployee = roleData.IsEmployee
	isCompany = roleData.IsCompany

	// 4. Tạo token
	tk := &models.Token{
		UserID:     u.ID,
		Name:       u.Name,
		OrgID:      u.OrgID,
		Role:       u.Role,
		IsEmployee: isEmployee,
		IsCompany:  isCompany,
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

	// Normalize role
	role := u.Role
	if role == "giam_doc_xi_nghiep" {
		role = constant.ROLE_GIAM_DOC_XN
	}

	// Get Role Data
	isEmployee := false
	isCompany := false
	if roleData, err := t.roleRepo.GetByCode(ctx, role); err == nil && roleData != nil {
		isEmployee = roleData.IsEmployee
		isCompany = roleData.IsCompany
	}

	// Create system token
	tk := &models.Token{
		UserID:     u.ID,
		Name:       u.Name,
		OrgID:      u.OrgID,
		Role:       role,
		IsEmployee: isEmployee,
		IsCompany:  isCompany,
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
