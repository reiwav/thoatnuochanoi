package contract_category

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"errors"
	"fmt"
	"strings"
)

func (s *service) Create(ctx context.Context, category *models.ContractCategory) error {
	if category.ParentID != "" {
		parent, err := s.repo.GetByID(ctx, category.ParentID)
		if err != nil {
			return fmt.Errorf("parent category not found: %w", err)
		}
		category.Level = parent.Level + 1
	} else {
		category.Level = 0
		category.Path = ","
	}

	_ = s.ensureDriveFolder(ctx, category)

	err := s.repo.Upsert(ctx, category)
	if err != nil {
		return err
	}

	if category.ParentID != "" {
		parent, _ := s.repo.GetByID(ctx, category.ParentID)
		category.Path = parent.Path + category.ID + ","
	} else {
		category.Path = "," + category.ID + ","
	}

	return s.repo.Upsert(ctx, category)
}

func (s *service) Update(ctx context.Context, id string, category *models.ContractCategory) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("category not found")
	}

	if category.ParentID != existing.ParentID {
		oldPath := existing.Path
		var newPath string
		var newLevel int

		if category.ParentID != "" {
			parent, err := s.repo.GetByID(ctx, category.ParentID)
			if err != nil {
				return errors.New("new parent not found")
			}
			newPath = parent.Path + id + ","
			newLevel = parent.Level + 1
		} else {
			newPath = "," + id + ","
			newLevel = 0
		}

		descendants, err := s.repo.GetByPath(ctx, oldPath)
		if err == nil {
			for _, d := range descendants {
				if d.ID == id {
					continue
				}
				d.Path = strings.Replace(d.Path, oldPath, newPath, 1)
				d.Level = d.Level + (newLevel - existing.Level)
				_ = s.repo.Upsert(ctx, d)
			}
		}

		existing.ParentID = category.ParentID
		existing.Path = newPath
		existing.Level = newLevel
	}

	existing.Name = category.Name
	existing.Code = category.Code
	existing.Description = category.Description
	existing.Status = category.Status
	existing.Order = category.Order

	_ = s.ensureDriveFolder(ctx, existing)

	return s.repo.Upsert(ctx, existing)
}

func (s *service) Delete(ctx context.Context, id string) error {
	category, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	descendants, err := s.repo.GetByPath(ctx, category.Path)
	if err == nil && len(descendants) > 1 {
		return errors.New("cannot delete category with sub-categories")
	}
	return s.repo.Delete(ctx, id)
}

func (s *service) GetByID(ctx context.Context, id string) (*models.ContractCategory, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *service) List(ctx context.Context, f filter.Filter) ([]*models.ContractCategory, int64, error) {
	return s.repo.List(ctx, f)
}

func (s *service) GetTree(ctx context.Context) ([]*models.ContractCategory, error) {
	f := filter.NewPaginationFilter()
	f.PerPage = 1000
	cats, _, err := s.repo.List(ctx, f)
	return cats, err
}
