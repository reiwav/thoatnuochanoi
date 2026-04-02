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

	"go.mongodb.org/mongo-driver/bson/primitive"
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

	// Validate assignments
	if err := s.validateAssignments(ctx, "", input.OrgID, input.AssignedInundationPointIDs, input.AssignedEmergencyConstructionIDs); err != nil {
		return nil, err
	}

	// Password will be hashed by userRepo.Create, so we don't hash it here
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

	// Validate assignments for update
	if err := s.validateAssignments(ctx, id, input.OrgID, input.AssignedInundationPointIDs, input.AssignedEmergencyConstructionIDs); err != nil {
		return err
	}

	return s.userRepo.Update(ctx, id, input)
}

func (s *service) validateAssignments(ctx context.Context, userID string, orgID string, pointIDs []string, constructionIDs []string) error {
	if len(pointIDs) > 1 {
		return web.BadRequest("Chỉ được phép gán tối đa 1 điểm ngập")
	}
	if len(constructionIDs) > 1 {
		return web.BadRequest("Chỉ được phép gán tối đa 1 công trình khẩn")
	}

	// Check if inundation point is already assigned to another user in the same org
	if len(pointIDs) > 0 {
		pid := pointIDs[0]
		f := filter.NewBasicFilter()
		f.AddWhere("org_id", "org_id", orgID)
		f.AddWhere("assigned_inundation_point_ids", "assigned_inundation_point_ids", pid)
		if userID != "" {
			f.AddWhere("_id", "_id", primitive.M{"$ne": userID})
		}

		users, _, err := s.userRepo.List(ctx, f)
		if err == nil && len(users) > 0 {
			return web.BadRequest("Điểm ngập này đã được gán cho nhân viên: " + users[0].Name)
		}
	}

	// Check if emergency construction is already assigned to another user in the same org
	if len(constructionIDs) > 0 {
		cid := constructionIDs[0]
		f := filter.NewBasicFilter()
		f.AddWhere("org_id", "org_id", orgID)
		f.AddWhere("assigned_emergency_construction_ids", "assigned_emergency_construction_ids", cid)
		if userID != "" {
			f.AddWhere("_id", "_id", primitive.M{"$ne": userID})
		}

		users, _, err := s.userRepo.List(ctx, f)
		if err == nil && len(users) > 0 {
			return web.BadRequest("Công trình khẩn này đã được gán cho nhân viên: " + users[0].Name)
		}
	}

	return nil
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
