package emergency_construction

import (
	"ai-api-tnhn/internal/models"
	"context"
	"errors"
	"fmt"
	"time"
	"golang.org/x/sync/errgroup"
)

func (s *service) saveProgress(ctx context.Context, progress *models.EmergencyConstructionProgress, images []ImageContent, isNew bool) error {
	if progress.ProgressPercentage >= 100 || progress.IsCompleted {
		progress.IsCompleted = true
		progress.ProgressPercentage = 100
		if progress.ExpectedCompletionDate == 0 {
			progress.ExpectedCompletionDate = time.Now().Unix()
		}
	}

	if len(images) > 0 {
		imageIDs, err := s.uploadImages(ctx, progress.ReportedBy, progress.ConstructionID, images)
		if err == nil {
			progress.Images = append(progress.Images, imageIDs...)
		}
	}

	return s.progressRepo.Upsert(ctx, progress)
}

func (s *service) uploadImages(ctx context.Context, userID string, constructionID string, images []ImageContent) ([]string, error) {
	u, err := s.userRepo.GetByID(ctx, userID)
	if err != nil || u == nil || u.OrgID == "" {
		return nil, errors.New("user or organization not found")
	}

	org, err := s.orgRepo.GetByID(ctx, u.OrgID)
	if err != nil || org == nil {
		return nil, errors.New("organization not found")
	}

	folderID, err := s.resolveUploadFolder(ctx, org, "CONSTRUCTION", constructionID)
	if err != nil {
		return nil, err
	}

	g, gCtx := errgroup.WithContext(ctx)
	imageIDs := make([]string, len(images))

	for i, img := range images {
		i, img := i, img
		g.Go(func() error {
			id, err := s.driveSvc.UploadFileSimple(gCtx, folderID, img.Name, img.MimeType, img.Reader)
			if err == nil {
				imageIDs[i] = id
			}
			return err
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	var result []string
	for _, id := range imageIDs {
		if id != "" {
			result = append(result, id)
		}
	}
	return result, nil
}

func (s *service) resolveUploadFolder(ctx context.Context, org *models.Organization, dataType string, constructionID string) (string, error) {
	orgFolderID := org.DriveFolderID
	if orgFolderID == "" || orgFolderID == "." {
		newFolderID, err := s.driveSvc.CreateOrgFolder(ctx, org.Name)
		if err != nil {
			return "", err
		}
		orgFolderID = newFolderID
		org.DriveFolderID = newFolderID
		_ = s.orgRepo.Upsert(ctx, org)
	}

	// 1. Get/Create Type Folder (e.g., CONSTRUCTION)
	typeKey := fmt.Sprintf("type_%s_%s", orgFolderID, dataType)
	s.cacheMu.RLock()
	typeFolderID, ok := s.folderCache[typeKey]
	s.cacheMu.RUnlock()

	if !ok {
		var err error
		typeFolderID, err = s.driveSvc.FindOrCreateFolder(ctx, orgFolderID, dataType)
		if err != nil {
			return "", err
		}
		s.cacheMu.Lock()
		s.folderCache[typeKey] = typeFolderID
		s.cacheMu.Unlock()
	}

	if dataType == "REPORTS" {
		return typeFolderID, nil
	}

	// 2. Get/Create Construction Folder
	folderName := "UNKNOWN_CONSTRUCTION"
	if constructionID != "" {
		cons, err := s.repo.GetByID(ctx, constructionID)
		if err == nil && cons != nil {
			folderName = fmt.Sprintf("%s_%s", cons.Name, cons.ID)
		}
	}

	consKey := fmt.Sprintf("cons_%s_%s", typeFolderID, folderName)
	s.cacheMu.RLock()
	consFolderID, ok := s.folderCache[consKey]
	s.cacheMu.RUnlock()

	if !ok {
		var err error
		consFolderID, err = s.driveSvc.FindOrCreateFolder(ctx, typeFolderID, folderName)
		if err != nil {
			return "", err
		}
		s.cacheMu.Lock()
		s.folderCache[consKey] = consFolderID
		s.cacheMu.Unlock()
	}

	// 3. Get/Create Date Folder
	dateFolderName := time.Now().Format("2006-01-02")
	dateKey := fmt.Sprintf("date_%s_%s", consFolderID, dateFolderName)
	s.cacheMu.RLock()
	dateFolderID, ok := s.folderCache[dateKey]
	s.cacheMu.RUnlock()

	if !ok {
		var err error
		dateFolderID, err = s.driveSvc.FindOrCreateFolder(ctx, consFolderID, dateFolderName)
		if err != nil {
			return "", err
		}
		s.cacheMu.Lock()
		s.folderCache[dateKey] = dateFolderID
		s.cacheMu.Unlock()

		_ = s.driveSvc.SetPublic(ctx, dateFolderID)
	}

	return dateFolderID, nil
}
