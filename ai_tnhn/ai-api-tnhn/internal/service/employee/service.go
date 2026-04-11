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

	"go.mongodb.org/mongo-driver/bson/primitive"
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
	if err := s.validateAssignments(ctx, "", input.OrgID, input.AssignedInundationPointIDs, input.AssignedRainStationIDs, input.AssignedLakeStationIDs, input.AssignedRiverStationIDs, input.AssignedEmergencyConstructionIDs, input.AssignedPumpingStationID); err != nil {
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
	existing.AssignedInundationPointIDs = input.AssignedInundationPointIDs
	existing.AssignedEmergencyConstructionIDs = input.AssignedEmergencyConstructionIDs
	existing.AssignedPumpingStationID = input.AssignedPumpingStationID

	if input.Password != "" && strings.TrimSpace(string(input.Password)) != "" {
		str, _ := input.Password.GererateHashedPassword()
		existing.Password = hash.NewPassword(str)
	}

	// Validate assignments on the merged record
	if err := s.validateAssignments(ctx, id, existing.OrgID, existing.AssignedInundationPointIDs, existing.AssignedRainStationIDs, existing.AssignedLakeStationIDs, existing.AssignedRiverStationIDs, existing.AssignedEmergencyConstructionIDs, existing.AssignedPumpingStationID); err != nil {
		return err
	}

	return s.userRepo.Update(ctx, id, existing)
}

func (s *service) validateAssignments(ctx context.Context, userID string, orgID string, pointIDs, rainIDs, lakeIDs, riverIDs, constructionIDs []string, stationID string) error {
	if len(pointIDs) > 1 {
		return web.BadRequest("Chỉ được phép gán tối đa 1 điểm ngập")
	}
	if len(rainIDs) > 1 {
		return web.BadRequest("Chỉ được phép gán tối đa 1 trạm mưa")
	}
	if len(lakeIDs) > 1 {
		return web.BadRequest("Chỉ được phép gán tối đa 1 trạm hồ")
	}
	if len(riverIDs) > 1 {
		return web.BadRequest("Chỉ được phép gán tối đa 1 trạm sông")
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

	// Check for Rain Station assignment
	if len(rainIDs) > 0 {
		rid := rainIDs[0]
		f := filter.NewBasicFilter()
		f.AddWhere("org_id", "org_id", orgID)
		f.AddWhere("assigned_rain_station_ids", "assigned_rain_station_ids", rid)
		if userID != "" {
			f.AddWhere("_id", "_id", primitive.M{"$ne": userID})
		}

		users, _, err := s.userRepo.List(ctx, f)
		if err == nil && len(users) > 0 {
			return web.BadRequest("Trạm mưa này đã được gán cho nhân viên: " + users[0].Name)
		}
	}

	// Check for Lake Station assignment
	if len(lakeIDs) > 0 {
		lid := lakeIDs[0]
		f := filter.NewBasicFilter()
		f.AddWhere("org_id", "org_id", orgID)
		f.AddWhere("assigned_lake_station_ids", "assigned_lake_station_ids", lid)
		if userID != "" {
			f.AddWhere("_id", "_id", primitive.M{"$ne": userID})
		}

		users, _, err := s.userRepo.List(ctx, f)
		if err == nil && len(users) > 0 {
			return web.BadRequest("Trạm hồ này đã được gán cho nhân viên: " + users[0].Name)
		}
	}

	// Check for River Station assignment
	if len(riverIDs) > 0 {
		rid := riverIDs[0]
		f := filter.NewBasicFilter()
		f.AddWhere("org_id", "org_id", orgID)
		f.AddWhere("assigned_river_station_ids", "assigned_river_station_ids", rid)
		if userID != "" {
			f.AddWhere("_id", "_id", primitive.M{"$ne": userID})
		}

		users, _, err := s.userRepo.List(ctx, f)
		if err == nil && len(users) > 0 {
			return web.BadRequest("Trạm sông này đã được gán cho nhân viên: " + users[0].Name)
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

	// Check if pumping station is already assigned to another user in the same org
	if stationID != "" {
		f := filter.NewBasicFilter()
		f.AddWhere("org_id", "org_id", orgID)
		f.AddWhere("assigned_pumping_station_id", "assigned_pumping_station_id", stationID)
		if userID != "" {
			f.AddWhere("_id", "_id", primitive.M{"$ne": userID})
		}

		users, _, err := s.userRepo.List(ctx, f)
		if err == nil && len(users) > 0 {
			return web.BadRequest("Trạm bơm này đã được gán cho nhân viên: " + users[0].Name)
		}
	}

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
