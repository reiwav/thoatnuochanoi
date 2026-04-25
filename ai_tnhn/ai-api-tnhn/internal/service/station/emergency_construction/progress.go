package emergency_construction

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"errors"
	"sort"
	"time"
	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) GetProgressByID(ctx context.Context, id string) (*models.EmergencyConstructionProgress, error) {
	return s.progressRepo.GetByID(ctx, id)
}

func (s *service) ReportProgress(ctx context.Context, progress *models.EmergencyConstructionProgress, images []ImageContent) error {
	return s.saveProgress(ctx, progress, images, true)
}

func (s *service) UpdateProgress(ctx context.Context, id string, progress *models.EmergencyConstructionProgress, images []ImageContent) error {
	existing, err := s.progressRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("progress report not found")
	}

	// Update fields
	existing.WorkDone = progress.WorkDone
	existing.Issues = progress.Issues
	existing.Order = progress.Order
	existing.Location = progress.Location
	existing.Influence = progress.Influence
	existing.Proposal = progress.Proposal

	if progress.ProgressPercentage >= 100 || progress.IsCompleted {
		existing.IsCompleted = true
		existing.ProgressPercentage = 100
		if existing.ExpectedCompletionDate == 0 {
			existing.ExpectedCompletionDate = time.Now().Unix()
		}
	} else {
		existing.ProgressPercentage = progress.ProgressPercentage
		existing.IsCompleted = false
	}

	// Upload images if any
	if len(images) > 0 {
		imageIDs, err := s.uploadImages(ctx, existing.ReportedBy, existing.ConstructionID, images)
		if err == nil {
			existing.Images = append(existing.Images, imageIDs...)
		}
	}

	// Save existing report
	return s.progressRepo.Upsert(ctx, existing)
}

func (s *service) GetProgressHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionProgress, error) {
	items, err := s.progressRepo.ListByConstructionID(ctx, constructionID)
	if err == nil {
		if cons, errCons := s.repo.GetByID(ctx, constructionID); errCons == nil && cons != nil {
			for _, item := range items {
				item.ConstructionName = cons.Name
			}
		}
		sort.Slice(items, func(i, j int) bool {
			return items[i].ReportDate > items[j].ReportDate
		})
	}
	return items, err
}

func (s *service) GetUnfinishedProgressHistory(ctx context.Context) ([]*models.EmergencyConstructionProgress, error) {
	// 1. Get all constructions that are NOT completed
	f := filter.NewPaginationFilter()
	f.PerPage = 1000 // Get all logical amount
	f.AddWhere("status", "status", bson.M{"$ne": "completed"})

	constructions, _, err := s.repo.List(ctx, f)
	if err != nil {
		return nil, err
	}

	if len(constructions) == 0 {
		return []*models.EmergencyConstructionProgress{}, nil
	}

	ids := make([]string, len(constructions))
	consMap := make(map[string]*models.EmergencyConstruction)
	for i, c := range constructions {
		ids[i] = c.ID
		consMap[c.ID] = c
	}

	// 2. Get all progress for these IDs
	pf := filter.NewPaginationFilter()
	pf.PerPage = 5000 // Large enough to get history
	pf.AddWhere("construction_id", "construction_id", bson.M{"$in": ids})

	progressList, _, err := s.progressRepo.List(ctx, pf)
	if err != nil {
		return nil, err
	}

	// 3. Map construction names
	for _, p := range progressList {
		if c, ok := consMap[p.ConstructionID]; ok {
			p.ConstructionName = c.Name
		}
	}

	// Sort by date descending
	sort.Slice(progressList, func(i, j int) bool {
		return progressList[i].ReportDate > progressList[j].ReportDate
	})

	return progressList, nil
}
