package auth

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/hash"
	"ai-api-tnhn/utils/web"
	"context"
	"encoding/json"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) GetByID(ctx context.Context, tokenID string) (*models.Token, error) {
	var tk *models.Token
	return tk, s.tokenRepo.R_SelectByID(ctx, tokenID, &tk)
}

func (s *service) GetProfile(ctx context.Context, tokenID string) (*models.User, error) {
	var tk *models.Token
	err := s.tokenRepo.R_SelectByID(ctx, tokenID, &tk)
	if err != nil {
		return nil, err
	}
	user, err := s.userRepo.GetByID(ctx, tk.UserID)
	if err != nil {
		return nil, err
	}

	if roleData, err := s.roleRepo.GetByCode(ctx, user.Role); err == nil && roleData != nil {
		user.IsEmployee = roleData.IsEmployee
		user.IsCompany = roleData.IsCompany
	}

	return user, nil
}

func (s *service) Logout(ctx context.Context, tokenID string) error {
	return s.tokenRepo.R_DeleteByID(ctx, tokenID)
}

func (s *service) Login(ctx context.Context, input LoginRequest) (*models.Token, error) {
	var u *models.User
	err := s.userRepo.R_SelectOne(ctx, bson.M{"email": input.Email}, &u)
	if err != nil {
		return nil, web.BadRequest("invalid email or password")
	}

	if !u.Active {
		return nil, web.BadRequest("account is disabled")
	}

	if err := u.Password.ComparePassword(input.Password); err != nil {
		return nil, web.BadRequest("invalid email or password ")
	}

	roleData, err := s.roleRepo.GetByCode(ctx, u.Role)
	if err != nil {
		return nil, web.BadRequest("Role not found")
	}

	tk := &models.Token{
		UserID:     u.ID,
		Name:       u.Name,
		OrgID:      u.OrgID,
		Role:       u.Role,
		Group:      roleData.Group,
		IsEmployee: roleData.IsEmployee,
		IsCompany:  roleData.IsCompany,
	}
	err = s.tokenRepo.R_Create(ctx, tk)

	return tk, err
}

func (s *service) UpdateProfile(ctx context.Context, tokenID string, input UpdateProfileRequest) error {
	user, err := s.GetProfile(ctx, tokenID)
	if err != nil {
		return err
	}

	user.Name = input.Name
	return s.userRepo.R_Update(ctx, user)
}

func (s *service) ChangePassword(ctx context.Context, tokenID string, input ChangePasswordRequest) error {
	if input.NewPassword != input.ConfirmPassword {
		return web.BadRequest("New password and confirm password do not match")
	}

	user, err := s.GetProfile(ctx, tokenID)
	if err != nil {
		return err
	}

	if err := user.Password.ComparePassword(input.OldPassword); err != nil {
		return web.BadRequest("Incorrect old password")
	}

	str, _ := hash.Password(input.NewPassword).GererateHashedPassword()
	user.Password = hash.NewPassword(str)

	return s.userRepo.R_Update(ctx, user)
}

func (s *service) OAuthLogin(ctx context.Context, email string) (*models.Token, error) {
	fmt.Println("======= email ========: ", email)
	users, total, err := s.userRepo.List(ctx, filter.NewBasicFilter())
	b, _ := json.Marshal(users)
	fmt.Println("======= users ========: ", string(b))
	fmt.Println("======= total ========: ", total)
	fmt.Println("======= err ========: ", err)

	var u *models.User
	err = s.userRepo.R_SelectOne(ctx, bson.M{"email": email}, &u)
	if err != nil {
		return nil, web.BadRequest("Employee not found with email: " + email)
	}

	if !u.Active {
		return nil, web.BadRequest("Account is disabled")
	}

	isEmployee := false
	isCompany := false
	group := ""
	if roleData, err := s.roleRepo.GetByCode(ctx, u.Role); err == nil && roleData != nil {
		isEmployee = roleData.IsEmployee
		isCompany = roleData.IsCompany
		group = roleData.Group
	}

	tk := &models.Token{
		UserID:     u.ID,
		Name:       u.Name,
		OrgID:      u.OrgID,
		Role:       u.Role,
		Group:      group,
		IsEmployee: isEmployee,
		IsCompany:  isCompany,
	}
	err = s.tokenRepo.R_Create(ctx, tk)

	return tk, err
}
