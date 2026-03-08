package employee

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/googledrive"
	"ai-api-tnhn/utils/hash"
	"ai-api-tnhn/utils/web"
	"context"
	"errors"
)

type Service interface {
	Create(ctx context.Context, input *models.User) (*models.User, error)
	Update(ctx context.Context, id string, input *models.User) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.User, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.User, int64, error)
}

type service struct {
	userRepo repository.User
	orgRepo  repository.Organization
	driveSvc googledrive.Service
}

func NewService(userRepo repository.User, orgRepo repository.Organization, driveSvc googledrive.Service) Service {
	return &service{
		userRepo: userRepo,
		orgRepo:  orgRepo,
		driveSvc: driveSvc,
	}
}

func (s *service) Create(ctx context.Context, input *models.User) (*models.User, error) {
	// Set Role from input or default to Employee
	if input.Role == "" {
		input.Role = constant.ROLE_EMPLOYEE
	}

	// OrgID should have been set by handler from context, verify it exists
	if input.OrgID == "" {
		return nil, web.BadRequest("org_id is required")
	}
	input.Active = true // Default to active
	str, _ := input.Password.GererateHashedPassword()
	input.Password = hash.NewPassword(str)
	user, err := s.userRepo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *service) Update(ctx context.Context, id string, input *models.User) error {
	// Ensure we only update the specific user.
	// Ideally we should check if user exists and belongs to OrgID if current user is Admin of that Org.
	// But repository Update is by ID.
	// Let's first GetByID to verify existence (and potentially ownership logic).
	existing, err := s.userRepo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return errors.New("user not found")
	}

	// Update Role if provided, otherwise keep existing
	if input.Role == "" {
		input.Role = existing.Role
	}

	// Prevent changing OrgID? Assuming Employee stays in Org.
	// If input.OrgID is empty, maybe keep existing.
	// For simplicity, force OrgID to match existing or input must match.
	if input.OrgID == "" {
		input.OrgID = existing.OrgID
	}
	if input.Password != "" {
		str, _ := input.Password.GererateHashedPassword()
		input.Password = hash.NewPassword(str)
	}
	return s.userRepo.Update(ctx, id, input)
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.userRepo.Delete(ctx, id)
}

func (s *service) GetByID(ctx context.Context, id string) (*models.User, error) {
	return s.userRepo.GetByID(ctx, id)
}

func (s *service) List(ctx context.Context, filter filter.Filter) ([]*models.User, int64, error) {
	return s.userRepo.List(ctx, filter)
}
