package inundation

import (
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

func (s *service) getOrgFolderID(ctx context.Context, org *models.Organization) (string, error) {
	folderID := org.DriveFolderID
	if folderID == "" || folderID == "." {
		fmt.Printf("Org %s has invalid DriveFolderID '%s'. Attempting to create/find a valid one...\n", org.Name, folderID)
		newFolderID, err := s.driveSvc.CreateOrgFolder(ctx, org.Name)
		if err != nil {
			return "", fmt.Errorf("failed to ensure org folder for '%s': %w", org.Name, err)
		}

		org.DriveFolderID = newFolderID
		_ = s.orgRepo.Upsert(ctx, org)
		return newFolderID, nil
	}
	return folderID, nil
}

func (s *service) resolveUploadFolder(ctx context.Context, org *models.Organization, dataType string, pointID string) (string, error) {
	orgFolderID, err := s.getOrgFolderID(ctx, org)
	if err != nil {
		return "", err
	}

	now := time.Now()
	yearStr := now.Format("2006")
	monthStr := now.Format("01")
	dayStr := now.Format("02")

	dateKey := fmt.Sprintf("%s_%s_%s_%s_%s_%s", org.ID, dataType, pointID, yearStr, monthStr, dayStr)

	s.cacheMu.RLock()
	cachedID, ok := s.folderCache[dateKey]
	s.cacheMu.RUnlock()
	if ok {
		return cachedID, nil
	}

	typeFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, orgFolderID, dataType)
	if err != nil {
		return "", fmt.Errorf("failed to handle type folder '%s': %w", dataType, err)
	}

	stationFolderName := "UNKNOWN_STATION"
	if pointID != "" {
		point, err := s.inundationStationRepo.GetByID(ctx, pointID)
		if err == nil && point != nil {
			stationFolderName = fmt.Sprintf("%s_%s", point.Name, point.ID)
		} else {
			stationFolderName = fmt.Sprintf("ID_%s", pointID)
		}
	}
	stationFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, typeFolderID, stationFolderName)
	if err != nil {
		return "", fmt.Errorf("failed to handle station folder '%s': %w", stationFolderName, err)
	}

	yearFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, stationFolderID, yearStr)
	if err != nil {
		return "", fmt.Errorf("failed to handle year folder '%s': %w", yearStr, err)
	}

	monthFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, yearFolderID, monthStr)
	if err != nil {
		return "", fmt.Errorf("failed to handle month folder '%s': %w", monthStr, err)
	}

	dayFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, monthFolderID, dayStr)
	if err != nil {
		return "", fmt.Errorf("failed to handle day folder '%s': %w", dayStr, err)
	}

	if dayFolderID != "" {
		s.cacheMu.Lock()
		s.folderCache[dateKey] = dayFolderID
		s.cacheMu.Unlock()
		_ = s.driveSvc.SetPublic(ctx, dayFolderID)
	}

	return dayFolderID, nil
}

func (s *service) saveLocalImages(prefix string, images []ImageContent) ([]string, error) {
	baseDir := "uploads/inundation_tmp"
	if _, err := os.Stat(baseDir); os.IsNotExist(err) {
		_ = os.MkdirAll(baseDir, 0755)
	}

	var savedPaths []string
	for i, img := range images {
		fileName := fmt.Sprintf("%s_%d_%d%s", prefix, time.Now().UnixNano(), i, filepath.Ext(img.Name))
		if filepath.Ext(img.Name) == "" {
			fileName += ".jpg"
		}

		relPath := filepath.Join("inundation_tmp", fileName)
		fullPath := filepath.Join("uploads", relPath)

		out, err := os.Create(fullPath)
		if err != nil {
			return savedPaths, fmt.Errorf("failed to create local file: %w", err)
		}

		_, err = io.Copy(out, img.Reader)
		out.Close()
		if err != nil {
			return savedPaths, fmt.Errorf("failed to save local file content: %w", err)
		}

		savedPaths = append(savedPaths, relPath)
	}

	return savedPaths, nil
}

func (s *service) calculateFloodLevel(ctx context.Context, depth float64) *models.FloodLevel {
	setting, err := s.settingSvc.GetByCode(ctx, "FloodLevel")
	if err != nil || setting == nil {
		return nil
	}

	for i := range setting.FloodLevels {
		level := setting.FloodLevels[i]
		if depth >= level.MinDepth && depth < level.MaxDepth {
			return &level
		}
	}
	return nil
}
