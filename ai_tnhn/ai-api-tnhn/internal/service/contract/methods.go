package contract

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"io"
	"strings"
)

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
		if contract.CategoryID != "" {
			cat, err := s.catRepo.GetByID(ctx, contract.CategoryID)
			if err == nil && cat != nil && cat.DriveFolderID != "" {
				_ = s.driveSvc.MoveFile(ctx, existing.DriveFolderID, cat.DriveFolderID)
			}
		}
	}

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

	if strings.Contains(contract.DriveFolderID, "/") {
		_ = s.ensureDriveFolder(ctx, contract, contract.OrgID)
		_ = s.repo.Upsert(ctx, contract)
	}

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

	for _, contract := range contracts {
		if strings.Contains(contract.DriveFolderID, "/") {
			_ = s.ensureDriveFolder(ctx, contract, contract.OrgID)
			_ = s.repo.Upsert(ctx, contract)
		}

		if contract.DriveFolderID != "" && s.driveSvc != nil {
			files, _ := s.driveSvc.ListFiles(ctx, contract.DriveFolderID)
			contract.Files = files
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
