package emergency_construction

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"errors"
)

type Service interface {
	Create(ctx context.Context, item *models.EmergencyConstruction, userID string) error
	Update(ctx context.Context, id string, item *models.EmergencyConstruction, userID string) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.EmergencyConstruction, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstruction, int64, error)
	ListHistory(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstructionHistory, int64, error)
	GetHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionHistory, error)
}

type service struct {
	repo        repository.EmergencyConstruction
	historyRepo repository.EmergencyConstructionHistory
}

func NewService(repo repository.EmergencyConstruction, historyRepo repository.EmergencyConstructionHistory) Service {
	return &service{
		repo:        repo,
		historyRepo: historyRepo,
	}
}

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
	return s.repo.GetByID(ctx, id)
}

func (s *service) List(ctx context.Context, f filter.Filter) ([]*models.EmergencyConstruction, int64, error) {
	return s.repo.List(ctx, f)
}

func (s *service) ListHistory(ctx context.Context, f filter.Filter) ([]*models.EmergencyConstructionHistory, int64, error) {
	return s.historyRepo.List(ctx, f)
}

func (s *service) GetHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionHistory, error) {
	return s.historyRepo.ListByConstructionID(ctx, constructionID)
}
