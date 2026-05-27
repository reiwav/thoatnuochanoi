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

	if contract.DriveFolderID != "" && !strings.Contains(contract.DriveFolderID, "/") {
		return nil
	}

	// Get org's Drive folder as the parent
	orgFolderID := ""
	if orgID != "" && s.orgRepo != nil {
		org, err := s.orgRepo.GetByID(ctx, orgID)
		if err == nil && org != nil {
			orgFolderID = org.DriveFolderID
		}
	}

	// Create "contracts" folder inside the org folder (or root if no org folder)
	contractsRootID, err := s.driveSvc.FindOrCreateFolder(ctx, orgFolderID, "contracts")
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

	folderName := contract.ContractNumber
	if folderName == "" {
		folderName = contract.Name
	}
	if folderName == "" {
		folderName = "No_Name_Contract"
	}
	folderName = strings.ReplaceAll(folderName, "/", "_")
	contractFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, monthID, folderName)
	if err != nil {
		return fmt.Errorf("failed to ensure contract specific folder: %w", err)
	}
	contract.DriveFolderID = contractFolderID
	contract.DriveFolderLink = s.driveSvc.GetFolderLink(ctx, contractFolderID)

	return nil
}
