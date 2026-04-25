package contract_category

import (
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
)

func (s *service) ensureDriveFolder(ctx context.Context, category *models.ContractCategory) error {
	if s.driveSvc == nil {
		return nil
	}

	parentDriveID := ""
	if category.ParentID != "" {
		parent, err := s.repo.GetByID(ctx, category.ParentID)
		if err == nil && parent != nil && parent.DriveFolderID != "" {
			parentDriveID = parent.DriveFolderID
		}
	}

	if parentDriveID == "" {
		var err error
		parentDriveID, err = s.driveSvc.FindOrCreateFolder(ctx, "", "CONTRACTS")
		if err != nil {
			return fmt.Errorf("failed to ensure CONTRACTS root folder: %w", err)
		}
	}

	driveID, err := s.driveSvc.FindOrCreateFolder(ctx, parentDriveID, category.Name)
	if err != nil {
		return fmt.Errorf("failed to create drive folder for category: %w", err)
	}

	category.DriveFolderID = driveID
	return nil
}
