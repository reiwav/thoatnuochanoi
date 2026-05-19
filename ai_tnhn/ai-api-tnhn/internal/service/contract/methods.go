package contract

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func (s *service) Create(ctx context.Context, contract *models.Contract) error {
	_ = s.ensureDriveFolder(ctx, contract, contract.OrgID)
	err := s.repo.Upsert(ctx, contract)
	if err == nil && s.syncWorker != nil {
		s.syncWorker.Enqueue(contract.ID)
	}
	return err
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
	err = s.repo.Upsert(ctx, existing)
	if err == nil && s.syncWorker != nil {
		s.syncWorker.Enqueue(existing.ID)
	}
	return err
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
	}

	return contracts, total, nil
}

func (s *service) UploadFile(ctx context.Context, id string, name, mimeType string, content io.Reader) (string, error) {
	contract, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", err
	}

	localID, err := s.UploadToFolder(ctx, contract.DriveFolderID, name, mimeType, content)
	if err != nil {
		return "", err
	}

	contract.Files = append(contract.Files, googledrive.FileInfo{
		ID:   localID,
		Name: name,
		Link: "/api/storage/file/" + strings.TrimPrefix(localID, "local:"),
	})

	_ = s.repo.Upsert(ctx, contract)

	if s.syncWorker != nil {
		s.syncWorker.Enqueue(contract.ID)
	}

	return localID, nil
}

func (s *service) UploadToFolder(ctx context.Context, folderID, name, mimeType string, content io.Reader) (string, error) {
	tmpDir := "uploads/contract_tmp"
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create temp directory: %w", err)
	}

	ext := filepath.Ext(name)
	base := strings.TrimSuffix(name, ext)
	uniqueName := fmt.Sprintf("%s_%d%s", base, time.Now().UnixNano(), ext)

	filePath := filepath.Join(tmpDir, uniqueName)
	outFile, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create local file: %w", err)
	}
	defer outFile.Close()

	if _, err := io.Copy(outFile, content); err != nil {
		return "", fmt.Errorf("failed to save file locally: %w", err)
	}

	return "local:contract_tmp/" + uniqueName, nil
}

func (s *service) DeleteDriveFile(ctx context.Context, fileID string) error {
	if s.driveSvc == nil {
		return fmt.Errorf("google drive service not available")
	}
	return s.driveSvc.DeleteFile(ctx, fileID)
}

func (s *service) PrepareDriveFolder(ctx context.Context, orgID, categoryID, name string) (string, string, error) {
	// Simply return a temporary local path identifier.
	// The background sync worker will create the actual Google Drive folder later.
	tempID := fmt.Sprintf("local:contract_tmp/%s_%d", categoryID, time.Now().UnixNano())
	return tempID, "/api/storage/file/" + strings.TrimPrefix(tempID, "local:"), nil
}
