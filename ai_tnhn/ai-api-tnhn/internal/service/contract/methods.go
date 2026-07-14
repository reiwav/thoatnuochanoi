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

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) Create(ctx context.Context, contract *models.Contract) error {
	_ = s.ensureDriveFolder(ctx, contract, contract.OrgID)

	err := s.repo.Upsert(ctx, contract)
	if err != nil {
		return err
	}

	var tempFolderRelPath string
	for _, file := range contract.Files {
		if strings.HasPrefix(file.ID, "local:contracts/") && strings.Contains(file.ID, "/temp_") {
			parts := strings.Split(strings.TrimPrefix(file.ID, "local:"), "/")
			if len(parts) >= 3 {
				tempFolderRelPath = filepath.Join(parts[0], parts[1], parts[2])
				break
			}
		}
	}

	if tempFolderRelPath != "" {
		oldDir := filepath.Join("uploads", tempFolderRelPath)
		newFolderRelPath := fmt.Sprintf("contracts/%s/%s", contract.OrgID, contract.ID)
		newDir := filepath.Join("uploads", newFolderRelPath)

		if _, err := os.Stat(oldDir); err == nil {
			_ = os.MkdirAll(filepath.Dir(newDir), 0755)
			if err := os.Rename(oldDir, newDir); err == nil {
				for i, file := range contract.Files {
					if strings.HasPrefix(file.ID, "local:"+tempFolderRelPath) {
						filename := filepath.Base(file.ID)
						newID := "local:" + newFolderRelPath + "/" + filename
						contract.Files[i].ID = newID
						contract.Files[i].Link = "/api/storage/file/" + newFolderRelPath + "/" + filename
					}
				}
				err = s.repo.Upsert(ctx, contract)
			}
		}
	}

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
	existing.ContractNumber = contract.ContractNumber
	existing.InvestorName = contract.InvestorName
	existing.JVMembers = contract.JVMembers
	existing.CategoryID = contract.CategoryID
	existing.StartDate = contract.StartDate
	existing.EndDate = contract.EndDate
	existing.Stages = contract.Stages
	existing.Note = contract.Note
	existing.DriveFolderID = contract.DriveFolderID
	existing.DriveFolderLink = contract.DriveFolderLink
	existing.Files = contract.Files
	existing.Content = contract.Content
	existing.JointVentureMembers = contract.JointVentureMembers

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
	var relPath string

	if strings.HasPrefix(folderID, "local:") {
		relPath = strings.TrimPrefix(folderID, "local:")
	} else {
		var contract models.Contract
		err := s.repo.R_SelectOne(ctx, bson.M{"drive_folder_id": folderID}, &contract)
		if err == nil && contract.ID != "" {
			relPath = fmt.Sprintf("contracts/%s/%s", contract.OrgID, contract.ID)
		} else {
			relPath = fmt.Sprintf("contracts/unknown/%s", folderID)
		}
	}

	tmpDir := filepath.Join("uploads", relPath)
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
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

	return "local:" + relPath + "/" + uniqueName, nil
}

func (s *service) DeleteDriveFile(ctx context.Context, fileID string) error {
	if strings.HasPrefix(fileID, "local:") {
		relPath := strings.TrimPrefix(fileID, "local:")
		relPath = filepath.Clean(relPath)
		if strings.HasPrefix(relPath, "..") || filepath.IsAbs(relPath) {
			return fmt.Errorf("invalid file path")
		}
		filePath := filepath.Join("uploads", relPath)
		if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("failed to delete local file: %w", err)
		}
		return nil
	}

	if s.driveSvc == nil {
		return fmt.Errorf("google drive service not available")
	}
	return s.driveSvc.DeleteFile(ctx, fileID)
}

func (s *service) PrepareDriveFolder(ctx context.Context, orgID, categoryID, name string) (string, string, error) {
	tempID := fmt.Sprintf("local:contracts/%s/temp_%d", orgID, time.Now().UnixNano())
	return tempID, "/api/storage/file/" + strings.TrimPrefix(tempID, "local:"), nil
}
