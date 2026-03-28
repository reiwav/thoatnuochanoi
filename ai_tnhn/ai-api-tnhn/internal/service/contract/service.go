package contract

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/googledrive"
	"context"
	"fmt"
	"io"
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
	PrepareDriveFolder(ctx context.Context, orgID, categoryID, name string) (string, string, error)
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

	// Step 1: CONTRACTS root
	contractsRootID, err := s.driveSvc.FindOrCreateFolder(ctx, "", "CONTRACTS")
	if err != nil {
		return fmt.Errorf("failed to ensure CONTRACTS root folder: %w", err)
	}

	// Step 2: Org name folder under CONTRACTS
	orgFolderID := contractsRootID
	if orgID != "" && orgID != "all" && s.orgRepo != nil {
		org, err := s.orgRepo.GetByID(ctx, orgID)
		if err == nil && org != nil && org.Name != "" {
			orgFolderID, err = s.driveSvc.FindOrCreateFolder(ctx, contractsRootID, org.Name)
			if err != nil {
				orgFolderID = contractsRootID // fallback
			}
		}
	}

	// Step 3: Category folder under Org
	parentDriveID := orgFolderID
	if contract.CategoryID != "" {
		cat, err := s.catRepo.GetByID(ctx, contract.CategoryID)
		if err == nil && cat != nil {
			if cat.DriveFolderID == "" {
				catFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, orgFolderID, cat.Name)
				if err == nil {
					cat.DriveFolderID = catFolderID
					_ = s.catRepo.Upsert(ctx, cat)
					parentDriveID = catFolderID
				}
			} else {
				parentDriveID = cat.DriveFolderID
			}
		}
	}

	// Step 4: Year / Month / Day subfolders
	now := time.Now()
	yearStr := now.Format("2006")
	monthStr := fmt.Sprintf("Tháng %s", now.Format("01"))
	dayStr := fmt.Sprintf("Ngày %s", now.Format("02"))

	if yearID, err := s.driveSvc.FindOrCreateFolder(ctx, parentDriveID, yearStr); err == nil {
		if monthID, err := s.driveSvc.FindOrCreateFolder(ctx, yearID, monthStr); err == nil {
			if dayID, err := s.driveSvc.FindOrCreateFolder(ctx, monthID, dayStr); err == nil {
				parentDriveID = dayID
			}
		}
	}

	// Step 5: Use day folder as the contract's upload target
	if contract.DriveFolderID == "" {
		contract.DriveFolderID = parentDriveID
		contract.DriveFolderLink = s.driveSvc.GetFolderLink(ctx, parentDriveID)
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

	if existing.DriveFolderID == "" {
		_ = s.ensureDriveFolder(ctx, existing, existing.OrgID)
	}

	return s.repo.Upsert(ctx, existing)
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *service) GetByID(ctx context.Context, id string) (*models.Contract, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *service) List(ctx context.Context, f filter.Filter) ([]*models.Contract, int64, error) {
	return s.repo.List(ctx, f)
}

func (s *service) UploadFile(ctx context.Context, id string, name, mimeType string, content io.Reader) (string, error) {
	contract, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", err
	}

	if contract.DriveFolderID == "" {
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
