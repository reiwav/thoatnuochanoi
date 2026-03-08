package emergency_construction

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"errors"
	"time"
)

type Service interface {
	Create(ctx context.Context, item *models.EmergencyConstruction, userID string) error
	Update(ctx context.Context, id string, item *models.EmergencyConstruction, userID string) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.EmergencyConstruction, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstruction, int64, error)
	ListHistory(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstructionProgress, int64, error)
	GetHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionHistory, error)

	// Progress Reporting
	ReportProgress(ctx context.Context, progress *models.EmergencyConstructionProgress) error
	GetProgressHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionProgress, error)
}

type service struct {
	repo         repository.EmergencyConstruction
	historyRepo  repository.EmergencyConstructionHistory
	progressRepo repository.EmergencyConstructionProgress
	userRepo     repository.User
	orgRepo      repository.Organization
}

func NewService(repo repository.EmergencyConstruction, historyRepo repository.EmergencyConstructionHistory, progressRepo repository.EmergencyConstructionProgress, userRepo repository.User, orgRepo repository.Organization) Service {
	return &service{
		repo:         repo,
		historyRepo:  historyRepo,
		progressRepo: progressRepo,
		userRepo:     userRepo,
		orgRepo:      orgRepo,
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

func (s *service) ListHistory(ctx context.Context, f filter.Filter) ([]*models.EmergencyConstructionProgress, int64, error) {
	items, total, err := s.progressRepo.List(ctx, f)
	if err != nil {
		return nil, 0, err
	}

	// Try resolving construction name (Not perfectly optimized but will work)
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

func (s *service) ReportProgress(ctx context.Context, progress *models.EmergencyConstructionProgress) error {
	// 0. Fetch Reporter Details
	if progress.ReportedBy != "" {
		u, err := s.userRepo.GetByID(ctx, progress.ReportedBy)
		if err == nil && u != nil {
			progress.ReporterName = u.Name
			progress.ReporterEmail = u.Email
			if u.OrgID != "" {
				org, err := s.orgRepo.GetByID(ctx, u.OrgID)
				if err == nil && org != nil {
					progress.ReporterOrgName = org.Name
				}
			}
		}
	}

	progress.ReportDate = time.Now().Unix()
	if progress.ProgressPercentage >= 100 || progress.IsCompleted {
		progress.IsCompleted = true
		progress.ProgressPercentage = 100
		if progress.ExpectedCompletionDate == 0 {
			progress.ExpectedCompletionDate = time.Now().Unix()
		}
	}

	// 1. Save progress report
	err := s.progressRepo.Create(ctx, progress)
	if err != nil {
		return err
	}

	return nil
}

func (s *service) GetProgressHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionProgress, error) {
	items, err := s.progressRepo.ListByConstructionID(ctx, constructionID)
	if err == nil {
		if cons, errCons := s.repo.GetByID(ctx, constructionID); errCons == nil && cons != nil {
			for _, item := range items {
				item.ConstructionName = cons.Name
			}
		}
	}
	return items, err
}
