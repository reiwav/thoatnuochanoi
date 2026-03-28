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
	PrepareDriveFolder(ctx context.Context, categoryID, name string) (string, string, error)
}

type service struct {
	repo     repository.Contract
	catRepo  repository.ContractCategory
	driveSvc googledrive.Service
}

func NewService(repo repository.Contract, catRepo repository.ContractCategory, driveSvc googledrive.Service) Service {
	return &service{repo: repo, catRepo: catRepo, driveSvc: driveSvc}
}

func (s *service) ensureDriveFolder(ctx context.Context, contract *models.Contract) error {
	if s.driveSvc == nil {
		return nil
	}

	parentDriveID := ""
	if contract.CategoryID != "" {
		cat, err := s.catRepo.GetByID(ctx, contract.CategoryID)
		if err == nil && cat != nil {
			if cat.DriveFolderID == "" {
				// If category has no folder, CONTRACTS root is fallback
				rootID, err := s.driveSvc.FindOrCreateFolder(ctx, "", "CONTRACTS")
				if err == nil {
					catFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, rootID, cat.Name)
					if err == nil {
						cat.DriveFolderID = catFolderID
						_ = s.catRepo.Upsert(ctx, cat)
						parentDriveID = catFolderID
					}
				}
			} else {
				parentDriveID = cat.DriveFolderID
			}
		}
	}

	if parentDriveID == "" {
		var err error
		parentDriveID, err = s.driveSvc.FindOrCreateFolder(ctx, "", "CONTRACTS")
		if err != nil {
			return fmt.Errorf("failed to ensure CONTRACTS root folder: %w", err)
		}
	}

	// NEW: Add Year/Month/Day structure
	now := time.Now()
	yearStr := now.Format("2006")
	monthStr := fmt.Sprintf("Tháng %s", now.Format("01"))
	dayStr := fmt.Sprintf("Ngày %s", now.Format("02"))

	yearID, err := s.driveSvc.FindOrCreateFolder(ctx, parentDriveID, yearStr)
	if err == nil {
		monthID, err := s.driveSvc.FindOrCreateFolder(ctx, yearID, monthStr)
		if err == nil {
			dayID, err := s.driveSvc.FindOrCreateFolder(ctx, monthID, dayStr)
			if err == nil {
				parentDriveID = dayID
			}
		}
	}

	folderName := fmt.Sprintf("%s", contract.Name)
	if contract.DriveFolderID == "" {
		driveID, err := s.driveSvc.FindOrCreateFolder(ctx, parentDriveID, folderName)
		if err != nil {
			return fmt.Errorf("failed to create drive folder for contract: %w", err)
		}
		contract.DriveFolderID = driveID
		contract.DriveFolderLink = s.driveSvc.GetFolderLink(ctx, driveID)
	} else {
		// Possibly move if parent changed? Handled in Update
	}

	return nil
}

func (s *service) Create(ctx context.Context, contract *models.Contract) error {
	_ = s.ensureDriveFolder(ctx, contract)
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
		_ = s.ensureDriveFolder(ctx, existing)
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
		_ = s.ensureDriveFolder(ctx, contract)
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

func (s *service) PrepareDriveFolder(ctx context.Context, categoryID, name string) (string, string, error) {
	tempContract := &models.Contract{
		CategoryID: categoryID,
		Name:       name,
	}

	err := s.ensureDriveFolder(ctx, tempContract)
	if err != nil {
		return "", "", err
	}

	return tempContract.DriveFolderID, tempContract.DriveFolderLink, nil
}
