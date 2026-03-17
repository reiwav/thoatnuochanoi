package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

type localService struct {
	basePath string
}

func NewLocalService(basePath string) (Service, error) {
	// Ensure base path exists
	if _, err := os.Stat(basePath); os.IsNotExist(err) {
		err := os.MkdirAll(basePath, 0755)
		if err != nil {
			return nil, fmt.Errorf("failed to create local storage directory: %w", err)
		}
	}
	return &localService{basePath: basePath}, nil
}

func (s *localService) UploadFile(ctx context.Context, folderID, name, mimeType string, content io.Reader, convert bool) (string, error) {
	// folderID can be used as a sub-directory
	targetDir := s.basePath
	if folderID != "" && folderID != "." {
		targetDir = filepath.Join(s.basePath, folderID)
		if _, err := os.Stat(targetDir); os.IsNotExist(err) {
			if err := os.MkdirAll(targetDir, 0755); err != nil {
				return "", fmt.Errorf("failed to create sub-directory: %w", err)
			}
		}
	}

	// Create a unique filename if necessary or use the provided name
	// For simplicity, we'll prefix with timestamp to avoid collisions if multiple uploads have same name
	fileName := fmt.Sprintf("%d_%s", time.Now().UnixNano(), name)
	filePath := filepath.Join(targetDir, fileName)

	out, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file on local storage: %w", err)
	}
	defer out.Close()

	_, err = io.Copy(out, content)
	if err != nil {
		return "", fmt.Errorf("failed to write content to local storage: %w", err)
	}

	// Return the relative path as the ID, prefixed with our special API segment
	relPath, err := filepath.Rel(s.basePath, filePath)
	if err != nil {
		return "/api/storage/file/" + filePath, nil // Fallback to absolute if rel fails
	}

	return "/api/storage/file/" + relPath, nil
}

func (s *localService) CreateFolder(ctx context.Context, parentID, name string) (string, error) {
	targetDir := s.basePath
	if parentID != "" && parentID != "." {
		// If parentID looks like an absolute path or relative to basePath, handle it
		// For simplicity, we assume parentID is relative to basePath if it doesn't start with /api/
		targetDir = filepath.Join(s.basePath, parentID)
	}

	folderPath := filepath.Join(targetDir, name)
	if _, err := os.Stat(folderPath); os.IsNotExist(err) {
		if err := os.MkdirAll(folderPath, 0755); err != nil {
			return "", fmt.Errorf("failed to create local folder: %w", err)
		}
	}

	relPath, err := filepath.Rel(s.basePath, folderPath)
	if err != nil {
		return name, nil // Fallback
	}
	return relPath, nil
}

func (s *localService) GetFileContent(ctx context.Context, fileID string) ([]byte, error) {
	// fileID can be a relative path or a URL starting with /api/storage/file/
	filePath := fileID
	const prefix = "/api/storage/file/"
	if len(fileID) > len(prefix) && fileID[:len(prefix)] == prefix {
		filePath = fileID[len(prefix):]
	}

	fullPath := filepath.Join(s.basePath, filePath)
	return os.ReadFile(fullPath)
}
