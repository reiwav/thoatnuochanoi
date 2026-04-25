package organization

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"errors"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) Create(ctx context.Context, org *models.Organization) error {
	if org.Email == "" {
		return errors.New("organization email is required")
	}
	if org.PhoneNumber == "" {
		return errors.New("organization phone number is required")
	}

	if org.Code != "" {
		existing, err := s.orgRepo.GetByCode(ctx, org.Code)
		if err == nil && existing != nil {
			return errors.New("organization code already exists")
		}
	}

	if s.driveSvc != nil {
		folderID, err := s.driveSvc.CreateOrgFolder(ctx, org.Name)
		if err != nil {
			return fmt.Errorf("failed to create drive folder: %w", err)
		}
		org.DriveFolderID = folderID
	}

	return s.orgRepo.Upsert(ctx, org)
}

func (s *service) Update(ctx context.Context, id string, org *models.Organization) error {
	existing, err := s.orgRepo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return errors.New("organization not found")
	}

	if org.Code != "" && org.Code != existing.Code {
		check, err := s.orgRepo.GetByCode(ctx, org.Code)
		if err == nil && check != nil && check.ID != id {
			return errors.New("organization code already exists")
		}
		existing.Code = org.Code
	}

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

func (s *service) GetPrimaryAndShared(ctx context.Context, user *models.User) (primaryOrgs []*models.Organization, sharedOrgs []*models.Organization, err error) {
	var allOrgs []*models.Organization
	err = s.orgRepo.R_SelectManyWithSort(ctx, bson.M{}, bson.M{"Name": 1}, &allOrgs)
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
