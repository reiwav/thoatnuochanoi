package emergency_construction

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"errors"
)

func (s *service) Create(ctx context.Context, item *models.EmergencyConstruction, userID string) error {
	err := s.repo.Upsert(ctx, item)
	if err != nil {
		return err
	}

	// Log history
	history := &models.EmergencyConstructionHistory{
		ConstructionID: item.ID,
		Action:         "create",
		NewStatus:      item.Status,
		UpdatedBy:      userID,
		Note:           "Created new emergency construction",
	}
	_ = s.historyRepo.Create(ctx, history)

	return nil
}

func (s *service) Update(ctx context.Context, id string, updateData *models.EmergencyConstruction, userID string) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("emergency construction not found")
	}

	oldStatus := existing.Status

	// Update fields
	existing.Name = updateData.Name
	existing.Description = updateData.Description
	existing.Location = updateData.Location
	existing.StartDate = updateData.StartDate
	existing.EndDate = updateData.EndDate
	existing.Status = updateData.Status
	existing.Cost = updateData.Cost
	existing.OrgID = updateData.OrgID

	err = s.repo.Upsert(ctx, existing)
	if err != nil {
		return err
	}

	// Log history if status changed or just general update
	action := "update_info"
	if oldStatus != existing.Status {
		action = "update_status"
	}

	history := &models.EmergencyConstructionHistory{
		ConstructionID: id,
		Action:         action,
		OldStatus:      oldStatus,
		NewStatus:      existing.Status,
		UpdatedBy:      userID,
		Note:           "Updated emergency construction",
	}
	_ = s.historyRepo.Create(ctx, history)

	return nil
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *service) GetByID(ctx context.Context, id string) (*models.EmergencyConstruction, error) {
	item, err := s.repo.GetByID(ctx, id)
	if err == nil && item != nil && item.OrgID != "" {
		if org, errOrg := s.orgRepo.GetByID(ctx, item.OrgID); errOrg == nil && org != nil {
			item.OrganizationName = org.Name
		}
	}
	return item, err
}

func (s *service) List(ctx context.Context, f filter.Filter) ([]*models.EmergencyConstruction, int64, error) {
	items, total, err := s.repo.List(ctx, f)
	if err == nil {
		// Try resolving organization name
		for _, item := range items {
			if item.OrgID != "" {
				if org, errOrg := s.orgRepo.GetByID(ctx, item.OrgID); errOrg == nil && org != nil {
					item.OrganizationName = org.Name
				}
			}
		}
	}
	return items, total, err
}

func (s *service) ListHistory(ctx context.Context, f filter.Filter) ([]*models.EmergencyConstructionProgress, int64, error) {
	items, total, err := s.progressRepo.List(ctx, f)
	if err != nil {
		return nil, 0, err
	}

	// Try resolving construction name
	for _, item := range items {
		if cons, err := s.repo.GetByID(ctx, item.ConstructionID); err == nil && cons != nil {
			item.ConstructionName = cons.Name
		}
	}
	return items, total, nil
}

func (s *service) GetHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionHistory, error) {
	return s.historyRepo.ListByConstructionID(ctx, constructionID)
}

func (s *service) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	return s.userRepo.GetByID(ctx, id)
}

func (s *service) GetOrgByID(ctx context.Context, id string) (*models.Organization, error) {
	return s.orgRepo.GetByID(ctx, id)
}
