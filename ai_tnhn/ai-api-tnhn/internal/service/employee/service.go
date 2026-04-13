package employee

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/googledrive"
	"ai-api-tnhn/utils/hash"
	"ai-api-tnhn/utils/web"
	"context"
	"errors"
	"strings"


)

type Service interface {
	Create(ctx context.Context, input *models.User, currentUserRole string) (*models.User, error)
	Update(ctx context.Context, id string, input *models.User, currentUserRole string) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.User, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.User, int64, error)
}

type service struct {
	userRepo repository.User
	orgRepo  repository.Organization
	roleRepo repository.Role
	driveSvc googledrive.Service
}

func NewService(userRepo repository.User, orgRepo repository.Organization, roleRepo repository.Role, driveSvc googledrive.Service) Service {
	return &service{
		userRepo: userRepo,
		orgRepo:  orgRepo,
		roleRepo: roleRepo,
		driveSvc: driveSvc,
	}
}

func (s *service) Create(ctx context.Context, input *models.User, currentUserRole string) (*models.User, error) {
	// Check Role level restriction
	if err := s.checkRoleLevel(ctx, currentUserRole, input.Role); err != nil {
		return nil, err
	}
	// Set Role from input or default to Employee
	// if input.Role == "" {
	// 	input.Role = constant.ROLE_EMPLOYEE
	// }

	// OrgID should have been set by handler from context, verify it exists
	if input.OrgID == "" {
		return nil, web.BadRequest("org_id is required")
	}
	input.Active = true // Default to active

	// Validate assignments
	if err := s.validateAssignments(ctx, "", input.OrgID, input.AssignedInundationStationIDs, input.AssignedRainStationIDs, input.AssignedLakeStationIDs, input.AssignedRiverStationIDs, input.AssignedEmergencyConstructionIDs, input.AssignedPumpingStationID); err != nil {
		return nil, err
	}

	// Password will be hashed by userRepo.Create, so we don't hash it here
	user, err := s.userRepo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *service) Update(ctx context.Context, id string, input *models.User, currentUserRole string) error {
	// Check Role level restriction
	if err := s.checkRoleLevel(ctx, currentUserRole, input.Role); err != nil {
		return err
	}
	// Ensure we only update the specific user.
	// Ideally we should check if user exists and belongs to OrgID if current user is Admin of that Org.
	// But repository Update is by ID.
	// Let's first GetByID to verify existence (and potentially ownership logic).
	existing, err := s.userRepo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return errors.New("user not found")
	}

	// Check if email changed and if new email is already taken
	if input.Email != "" && input.Email != existing.Email {
		f := filter.NewBasicFilter()
		f.AddWhere("email", "email", input.Email)
		users, _, err := s.userRepo.List(ctx, f)
		if err == nil && len(users) > 0 {
			return web.BadRequest("Email này đã được sử dụng bởi người dùng khác")
		}
		existing.Email = input.Email
		existing.Username = input.Email // Usually username = email in this system
	}

	// Merge changes into existing record to prevent clearing non-provided fields
	existing.Name = input.Name
	existing.Role = input.Role
	// OrgID usually shouldn't change for employee management, but if it does:
	if input.OrgID != "" {
		existing.OrgID = input.OrgID
	}
	existing.Active = input.Active
	existing.AssignedInundationStationIDs = input.AssignedInundationStationIDs
	existing.AssignedEmergencyConstructionIDs = input.AssignedEmergencyConstructionIDs
	existing.AssignedPumpingStationID = input.AssignedPumpingStationID

	if input.Password != "" && strings.TrimSpace(string(input.Password)) != "" {
		str, _ := input.Password.GererateHashedPassword()
		existing.Password = hash.NewPassword(str)
	}

	// Validate assignments on the merged record
	if err := s.validateAssignments(ctx, id, existing.OrgID, existing.AssignedInundationStationIDs, existing.AssignedRainStationIDs, existing.AssignedLakeStationIDs, existing.AssignedRiverStationIDs, existing.AssignedEmergencyConstructionIDs, existing.AssignedPumpingStationID); err != nil {
		return err
	}

	return s.userRepo.Update(ctx, id, existing)
}

func (s *service) validateAssignments(ctx context.Context, userID string, orgID string, pointIDs, rainIDs, lakeIDs, riverIDs, constructionIDs []string, stationID string) error {
	// Restrictions removed to allow multiple and overlapping assignments as requested.
	return nil
}

func (s *service) checkRoleLevel(ctx context.Context, currentUserRole, targetRole string) error {
	if currentUserRole == "super_admin" {
		return nil
	}

	currentInfo, err := s.roleRepo.GetByCode(ctx, currentUserRole)
	if err != nil || currentInfo == nil {
		return web.Forbidden("Không xác định được vai trò của bạn")
	}

	targetInfo, err := s.roleRepo.GetByCode(ctx, targetRole)
	if err != nil || targetInfo == nil {
		return web.BadRequest("Vai trò định gán không hợp lệ")
	}

	if targetInfo.Level < currentInfo.Level {
		return web.Forbidden("Bạn không có quyền thực hiện thao tác này cho vai trò có cấp độ cao hơn (Level nhỏ hơn)")
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
