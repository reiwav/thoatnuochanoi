package googledrive

import (
	"ai-api-tnhn/internal/service/storage"
	"context"
	"fmt"
	"io"
	"strings"
)

type storageWrapper struct {
	storageSvc storage.Service
	driveSvc   Service
}

func NewStorageWrapper(storageSvc storage.Service, driveSvc Service) Service {
	return &storageWrapper{
		storageSvc: storageSvc,
		driveSvc:   driveSvc,
	}
}

func (w *storageWrapper) UploadFile(ctx context.Context, folderID, name, mimeType string, content io.Reader, convert bool) (string, error) {
	if w.driveSvc != nil {
		return w.driveSvc.UploadFile(ctx, folderID, name, mimeType, content, convert)
	}
	return w.storageSvc.UploadFile(ctx, folderID, name, mimeType, content, convert)
}

func (w *storageWrapper) CreateFolder(ctx context.Context, parentID, name string) (string, error) {
	if w.driveSvc != nil {
		return w.driveSvc.CreateFolder(ctx, parentID, name)
	}
	return w.storageSvc.CreateFolder(ctx, parentID, name)
}

func (w *storageWrapper) CreateOrgFolder(ctx context.Context, orgName string) (string, error) {
	// Always try to create local folder if possible for consistency
	localID, err := w.storageSvc.CreateFolder(ctx, ".", orgName)
	if err != nil {
		fmt.Printf("Warning: failed to create local org folder: %v\n", err)
	}

	if w.driveSvc != nil {
		driveID, err := w.driveSvc.CreateOrgFolder(ctx, orgName)
		if err != nil {
			fmt.Printf("Warning: failed to create drive org folder: %v\n", err)
			return localID, nil // Fallback to local ID
		}
		return driveID, nil
	}
	return localID, nil
}

func (w *storageWrapper) InitOrgFolders(ctx context.Context, orgName string) (string, error) {
	var driveID string
	var err error

	if w.driveSvc != nil {
		driveID, err = w.driveSvc.InitOrgFolders(ctx, orgName)
		if err != nil {
			fmt.Printf("Warning: failed to init drive folders: %v\n", err)
		}
	}

	// Always ensure local structure exists
	orgFolderID, err := w.storageSvc.CreateFolder(ctx, ".", orgName)
	if err == nil {
		for _, subfolder := range DefaultSubfolders {
			_, err := w.storageSvc.CreateFolder(ctx, orgFolderID, subfolder)
			if err != nil {
				fmt.Printf("Warning: failed to create local subfolder %s for org %s: %v\n", subfolder, orgName, err)
			}
		}
	}

	if driveID != "" {
		return driveID, nil
	}
	return orgFolderID, nil
}

func (w *storageWrapper) FindOrCreateFolder(ctx context.Context, parentID, folderName string) (string, error) {
	// Try local first if it's a "path-like" parentID or if we are in local mode
	localID, _ := w.storageSvc.CreateFolder(ctx, parentID, folderName)

	if w.driveSvc != nil {
		driveID, err := w.driveSvc.FindOrCreateFolder(ctx, parentID, folderName)
		if err != nil {
			fmt.Printf("Warning: failed to find or create drive folder '%s': %v\n", folderName, err)
			return localID, nil // Fallback to local ID
		}
		return driveID, nil
	}
	return localID, nil
}

func (w *storageWrapper) TriggerReportGeneration(ctx context.Context, webhookURL, templateFileID, targetFolderID string, payload map[string]interface{}) (string, error) {
	if w.driveSvc == nil {
		return "", fmt.Errorf("google drive service required for report generation")
	}
	return w.driveSvc.TriggerReportGeneration(ctx, webhookURL, templateFileID, targetFolderID, payload)
}

func (w *storageWrapper) CopyFile(ctx context.Context, fileID, parentID, newName string) (string, error) {
	if w.driveSvc == nil {
		return "", fmt.Errorf("google drive service required for copy file")
	}
	return w.driveSvc.CopyFile(ctx, fileID, parentID, newName)
}

func (w *storageWrapper) GetFileContent(ctx context.Context, fileID string) ([]byte, error) {
	cleanID := strings.TrimSpace(fileID)

	// If fileID starts with /api/storage/file/, it's a local file
	const prefix = "/api/storage/file/"
	if strings.HasPrefix(cleanID, prefix) {
		return w.storageSvc.GetFileContent(ctx, cleanID)
	}

	if w.driveSvc == nil {
		return nil, fmt.Errorf("google drive service required for get file content")
	}
	return w.driveSvc.GetFileContent(ctx, cleanID)
}
