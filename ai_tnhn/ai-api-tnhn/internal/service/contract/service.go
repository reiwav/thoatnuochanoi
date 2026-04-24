package contract

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
	"fmt"
	"io"
	"strings"
	"time"
)

type Service interface {
	Create(ctx context.Context, contract *models.Contract) error
	Update(ctx context.Context, id string, contract *models.Contract) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.Contract, error)
	List(ctx context.Context, f filter.Filter) ([]*models.Contract, int64, error)
	UploadFile(ctx context.Context, id string, name, mimeType string, content io.Reader) (string, error)
	UploadToFolder(ctx context.Context, folderID, name, mimeType string, content io.Reader) (string, error)
	DeleteDriveFile(ctx context.Context, fileID string) error
	PrepareDriveFolder(ctx context.Context, orgID, categoryID, name string) (string, string, error)

	// AI query methods
	GetContractSummary(ctx context.Context) (*ContractSummaryStats, error)
	GetExpiringSoon(ctx context.Context, days int) ([]*ContractQueryResult, error)
	GetExpired(ctx context.Context) ([]*ContractQueryResult, error)
	GetStagesDueSoon(ctx context.Context, days int) ([]*StageQueryResult, error)
	GetStagesPassed(ctx context.Context) ([]*StageQueryResult, error)
	SearchContracts(ctx context.Context, keyword string) ([]*ContractQueryResult, error)
}

type service struct {
	repo     repository.Contract
	catRepo  repository.ContractCategory
	orgRepo  repository.Organization
	driveSvc googledrive.Service
}

func NewService(repo repository.Contract, catRepo repository.ContractCategory, orgRepo repository.Organization, driveSvc googledrive.Service) Service {
	return &service{repo: repo, catRepo: catRepo, orgRepo: orgRepo, driveSvc: driveSvc}
}

func (s *service) ensureDriveFolder(ctx context.Context, contract *models.Contract, orgID string) error {
	if s.driveSvc == nil {
		return nil
	}

	// Step 1: Org Folder
	parentDriveID := ""
	if orgID != "" && s.orgRepo != nil {
		org, err := s.orgRepo.GetByID(ctx, orgID)
		if err == nil && org != nil && org.Name != "" {
			parentDriveID, err = s.driveSvc.FindOrCreateFolder(ctx, "", org.Name)
			if err != nil {
				return fmt.Errorf("failed to ensure organization folder: %w", err)
			}
		}
	}

	// Step 2: CONTRACTS folder under Org
	contractsRootID, err := s.driveSvc.FindOrCreateFolder(ctx, parentDriveID, "CONTRACTS")
	if err != nil {
		return fmt.Errorf("failed to ensure CONTRACTS root folder: %w", err)
	}

	// Step 2: Year / Month subfolders
	now := time.Now()
	yearStr := now.Format("2006")
	monthStr := fmt.Sprintf("%d", now.Month()) // just number e.g. "3"

	yearID, err := s.driveSvc.FindOrCreateFolder(ctx, contractsRootID, yearStr)
	if err != nil {
		return fmt.Errorf("failed to ensure year folder: %w", err)
	}
	monthID, err := s.driveSvc.FindOrCreateFolder(ctx, yearID, monthStr)
	if err != nil {
		return fmt.Errorf("failed to ensure month folder: %w", err)
	}

	// Step 3: Repair logic - if existing ID is a path (contains /), overwrite it
	isPath := strings.Contains(contract.DriveFolderID, "/")

	if contract.DriveFolderID == "" || isPath {
		contract.DriveFolderID = monthID
		contract.DriveFolderLink = s.driveSvc.GetFolderLink(ctx, monthID)
	}

	return nil
}

func (s *service) Create(ctx context.Context, contract *models.Contract) error {
	_ = s.ensureDriveFolder(ctx, contract, contract.OrgID)
	return s.repo.Upsert(ctx, contract)
}

func (s *service) Update(ctx context.Context, id string, contract *models.Contract) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	categoryChanged := existing.CategoryID != contract.CategoryID
	existing.Name = contract.Name
	existing.CategoryID = contract.CategoryID
	existing.StartDate = contract.StartDate
	existing.EndDate = contract.EndDate
	existing.Stages = contract.Stages
	existing.Note = contract.Note

	if categoryChanged && existing.DriveFolderID != "" {
		// Move folder to new category folder
		if contract.CategoryID != "" {
			cat, err := s.catRepo.GetByID(ctx, contract.CategoryID)
			if err == nil && cat != nil && cat.DriveFolderID != "" {
				_ = s.driveSvc.MoveFile(ctx, existing.DriveFolderID, cat.DriveFolderID)
			}
		}
	}

	// Ensure drive folder is valid (repair if it's a path)
	_ = s.ensureDriveFolder(ctx, existing, existing.OrgID)

	return s.repo.Upsert(ctx, existing)
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *service) GetByID(ctx context.Context, id string) (*models.Contract, error) {
	contract, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Repair ID if it's a path
	if strings.Contains(contract.DriveFolderID, "/") {
		_ = s.ensureDriveFolder(ctx, contract, contract.OrgID)
		_ = s.repo.Upsert(ctx, contract)
	}

	// Dynamic file listing
	if contract.DriveFolderID != "" && s.driveSvc != nil {
		files, _ := s.driveSvc.ListFiles(ctx, contract.DriveFolderID)
		contract.Files = files
	}

	return contract, nil
}

func (s *service) List(ctx context.Context, f filter.Filter) ([]*models.Contract, int64, error) {
	contracts, total, err := s.repo.List(ctx, f)
	if err != nil {
		return nil, 0, err
	}

	// Dynamic resolution and repair for path-based IDs
	for _, contract := range contracts {
		if strings.Contains(contract.DriveFolderID, "/") {
			_ = s.ensureDriveFolder(ctx, contract, contract.OrgID)
			_ = s.repo.Upsert(ctx, contract)
		}

		// Dynamic file listing
		if contract.DriveFolderID != "" && s.driveSvc != nil {
			files, _ := s.driveSvc.ListFiles(ctx, contract.DriveFolderID)
			contract.Files = files
			fmt.Printf("DEBUG: Contract %s has %d files\n", contract.ID, len(files))
		}
	}

	return contracts, total, nil
}

func (s *service) UploadFile(ctx context.Context, id string, name, mimeType string, content io.Reader) (string, error) {
	contract, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", err
	}

	isPath := strings.Contains(contract.DriveFolderID, "/")
	if contract.DriveFolderID == "" || isPath {
		_ = s.ensureDriveFolder(ctx, contract, contract.OrgID)
		_ = s.repo.Upsert(ctx, contract)
	}

	if contract.DriveFolderID == "" {
		return "", fmt.Errorf("contract has no drive folder and failed to create one")
	}

	return s.UploadToFolder(ctx, contract.DriveFolderID, name, mimeType, content)
}

func (s *service) UploadToFolder(ctx context.Context, folderID, name, mimeType string, content io.Reader) (string, error) {
	if s.driveSvc == nil {
		return "", fmt.Errorf("google drive service not available")
	}
	return s.driveSvc.UploadFile(ctx, folderID, name, mimeType, content, false)
}

func (s *service) DeleteDriveFile(ctx context.Context, fileID string) error {
	if s.driveSvc == nil {
		return fmt.Errorf("google drive service not available")
	}
	return s.driveSvc.DeleteFile(ctx, fileID)
}

func (s *service) PrepareDriveFolder(ctx context.Context, orgID, categoryID, name string) (string, string, error) {
	tempContract := &models.Contract{
		OrgID:      orgID,
		CategoryID: categoryID,
		Name:       name,
	}

	err := s.ensureDriveFolder(ctx, tempContract, orgID)
	if err != nil {
		return "", "", err
	}

	return tempContract.DriveFolderID, tempContract.DriveFolderLink, nil
}
