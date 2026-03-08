package organization

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/utils/hash"
	"context"
	"errors"
	"fmt"

	"ai-api-tnhn/internal/service/googledrive"

	"go.mongodb.org/mongo-driver/bson"
)

type Service interface {
	Create(ctx context.Context, org *models.Organization) error
	Update(ctx context.Context, id string, org *models.Organization) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.Organization, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.Organization, int64, error)
	FindAll(ctx context.Context, page, limit int) ([]*models.Organization, int64, error)
}

type service struct {
	orgRepo  repository.Organization
	userRepo repository.User
	driveSvc googledrive.Service
}

func NewService(orgRepo repository.Organization, userRepo repository.User, driveSvc googledrive.Service) Service {
	return &service{
		orgRepo:  orgRepo,
		userRepo: userRepo,
		driveSvc: driveSvc,
	}
}

func (s *service) Create(ctx context.Context, org *models.Organization) error {
	// 1. Validate mandatory fields
	if org.Email == "" {
		return errors.New("organization email is required")
	}
	if org.PhoneNumber == "" {
		return errors.New("organization phone number is required")
	}

	// 2. Check uniqueness of Code
	if org.Code != "" {
		existing, err := s.orgRepo.GetByCode(ctx, org.Code)
		if err == nil && existing != nil {
			return errors.New("organization code already exists")
		}
	}

	// 3. Check if email is already used by any user
	var existingUser *models.User
	err := s.userRepo.R_SelectOne(ctx, bson.M{"email": org.Email}, &existingUser)
	if err == nil && existingUser != nil {
		return errors.New("email is already associated with another account")
	}

	// 4. Create Google Drive Folder
	if s.driveSvc != nil {
		folderID, err := s.driveSvc.CreateOrgFolder(ctx, org.Name)
		if err != nil {
			return fmt.Errorf("failed to create drive folder: %w", err)
		}
		org.DriveFolderID = folderID
	}

	// 5. Create Organization
	err = s.orgRepo.Upsert(ctx, org)
	if err != nil {
		return err
	}

	// 6. Automatically create Admin account for this Organization
	adminUser := &models.User{
		Name:     org.Name + " Admin",
		Email:    org.Email,
		Username: org.Email,
		Password: hash.NewPassword(org.PhoneNumber),
		Role:     constant.ROLE_ADMIN_ORG,
		OrgID:    org.ID,
		Active:   true,
	}

	_, err = s.userRepo.Create(ctx, adminUser)
	return err
}

func (s *service) Update(ctx context.Context, id string, org *models.Organization) error {
	existing, err := s.orgRepo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return errors.New("organization not found")
	}

	// Prevent Code duplication if changed
	if org.Code != "" && org.Code != existing.Code {
		check, err := s.orgRepo.GetByCode(ctx, org.Code)
		if err == nil && check != nil && check.ID != id {
			return errors.New("organization code already exists")
		}
		existing.Code = org.Code
	}

	// Merge fields
	existing.Name = org.Name
	existing.Description = org.Description
	existing.Status = org.Status
	existing.Address = org.Address
	existing.PhoneNumber = org.PhoneNumber
	existing.Email = org.Email
	existing.Representative = org.Representative
	existing.RainStationIDs = org.RainStationIDs
	existing.LakeStationIDs = org.LakeStationIDs
	existing.RiverStationIDs = org.RiverStationIDs
	existing.InundationIDs = org.InundationIDs

	return s.orgRepo.Upsert(ctx, existing)
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.orgRepo.Delete(ctx, id)
}

func (s *service) GetByID(ctx context.Context, id string) (*models.Organization, error) {
	return s.orgRepo.GetByID(ctx, id)
}

func (s *service) List(ctx context.Context, filter filter.Filter) ([]*models.Organization, int64, error) {
	return s.orgRepo.List(ctx, filter)
}

func (s *service) FindAll(ctx context.Context, page, limit int) ([]*models.Organization, int64, error) {
	f := filter.NewPaginationFilter()
	f.Page = int64(page)
	f.PerPage = int64(limit)
	return s.orgRepo.List(ctx, f)
}
