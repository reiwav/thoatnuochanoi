package employee

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/hash"
	"ai-api-tnhn/utils/web"
	"context"
	"errors"
	"strings"
)

func (s *service) Create(ctx context.Context, input *models.User, currentUserRole string) (*models.User, error) {
	if err := s.checkRoleLevel(ctx, currentUserRole, input.Role); err != nil {
		return nil, err
	}

	if input.OrgID == "" {
		return nil, web.BadRequest("org_id is required")
	}
	input.Active = true

	if err := s.validateAssignments(ctx, "", input.OrgID, input.AssignedInundationStationIDs, input.AssignedRainStationIDs, input.AssignedLakeStationIDs, input.AssignedRiverStationIDs, input.AssignedEmergencyConstructionIDs, input.AssignedPumpingStationID, input.AssignedWastewaterStationID); err != nil {
		return nil, err
	}

	return s.userRepo.Create(ctx, input)
}

func (s *service) Update(ctx context.Context, id string, input *models.User, currentUserRole string) error {
	if err := s.checkRoleLevel(ctx, currentUserRole, input.Role); err != nil {
		return err
	}

	existing, err := s.userRepo.GetByID(ctx, id)
	if err != nil || existing == nil {
		return errors.New("user not found")
	}

	if input.Email != "" && input.Email != existing.Email {
		f := filter.NewBasicFilter()
		f.AddWhere("email", "email", input.Email)
		users, _, err := s.userRepo.List(ctx, f)
		if err == nil && len(users) > 0 {
			return web.BadRequest("Email này đã được sử dụng bởi người dùng khác")
		}
		existing.Email = input.Email
		existing.Username = input.Email
	}

	existing.Name = input.Name
	existing.Role = input.Role
	if input.OrgID != "" {
		existing.OrgID = input.OrgID
	}
	existing.Active = input.Active
	existing.AssignedInundationStationIDs = input.AssignedInundationStationIDs
	existing.AssignedEmergencyConstructionIDs = input.AssignedEmergencyConstructionIDs
	existing.AssignedPumpingStationID = input.AssignedPumpingStationID
	existing.AssignedWastewaterStationID = input.AssignedWastewaterStationID

	if input.Password != "" && strings.TrimSpace(string(input.Password)) != "" {
		str, _ := input.Password.GererateHashedPassword()
		existing.Password = hash.NewPassword(str)
	}

	if err := s.validateAssignments(ctx, id, existing.OrgID, existing.AssignedInundationStationIDs, existing.AssignedRainStationIDs, existing.AssignedLakeStationIDs, existing.AssignedRiverStationIDs, existing.AssignedEmergencyConstructionIDs, existing.AssignedPumpingStationID, existing.AssignedWastewaterStationID); err != nil {
		return err
	}

	return s.userRepo.Update(ctx, id, existing)
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
