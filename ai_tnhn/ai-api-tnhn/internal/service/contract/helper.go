package contract

import (
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"strings"
	"time"
)

func (s *service) ensureDriveFolder(ctx context.Context, contract *models.Contract, orgID string) error {
	if s.driveSvc == nil {
		return nil
	}

	parentDriveID := ""
	if orgID != "" && s.orgRepo != nil {
		org, err := s.orgRepo.GetByID(ctx, orgID)
		if err == nil && org != nil && org.Name != "" {
			parentDriveID, _ = s.driveSvc.FindOrCreateFolder(ctx, "", org.Name)
		}
	}

	contractsRootID, err := s.driveSvc.FindOrCreateFolder(ctx, parentDriveID, "CONTRACTS")
	if err != nil {
		return fmt.Errorf("failed to ensure CONTRACTS root folder: %w", err)
	}

	now := time.Now()
	yearStr := now.Format("2006")
	monthStr := fmt.Sprintf("%d", now.Month())

	yearID, err := s.driveSvc.FindOrCreateFolder(ctx, contractsRootID, yearStr)
	if err != nil {
		return fmt.Errorf("failed to ensure year folder: %w", err)
	}
	monthID, err := s.driveSvc.FindOrCreateFolder(ctx, yearID, monthStr)
	if err != nil {
		return fmt.Errorf("failed to ensure month folder: %w", err)
	}

	isPath := strings.Contains(contract.DriveFolderID, "/")
	if contract.DriveFolderID == "" || isPath {
		contract.DriveFolderID = monthID
		contract.DriveFolderLink = s.driveSvc.GetFolderLink(ctx, monthID)
	}

	return nil
}
