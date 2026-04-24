package organization

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"errors"
	"fmt"

	"ai-api-tnhn/internal/service/google/googledrive"

	"go.mongodb.org/mongo-driver/bson"
)

type Service interface {
	Create(ctx context.Context, org *models.Organization) error
	Update(ctx context.Context, id string, org *models.Organization) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.Organization, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.Organization, int64, error)
	FindAll(ctx context.Context, page, limit int) ([]*models.Organization, int64, error)
	GetPrimaryAndShared(ctx context.Context, userID string) (primaryOrgs []*models.Organization, sharedOrgs []*models.Organization, err error)
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

	// 4. Create Google Drive Folder
	if s.driveSvc != nil {
		folderID, err := s.driveSvc.CreateOrgFolder(ctx, org.Name)
		if err != nil {
			return fmt.Errorf("failed to create drive folder: %w", err)
		}
		org.DriveFolderID = folderID
	}

	// 5. Create Organization
	err := s.orgRepo.Upsert(ctx, org)
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
	existing.Order = org.Order

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

func (s *service) GetPrimaryAndShared(ctx context.Context, userID string) (primaryOrgs []*models.Organization, sharedOrgs []*models.Organization, err error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	var allOrgs []*models.Organization
	err = s.orgRepo.R_SelectMany(ctx, bson.M{}, &allOrgs)
	if err != nil {
		return nil, nil, err
	}

	if user.IsCompany {
		primaryOrgs = allOrgs
		sharedOrgs = []*models.Organization{}
	} else {
		for _, org := range allOrgs {
			if org.ID == user.OrgID {
				primaryOrgs = append(primaryOrgs, org)
			} else {
				sharedOrgs = append(sharedOrgs, org)
			}
		}
	}

	return primaryOrgs, sharedOrgs, nil
}
