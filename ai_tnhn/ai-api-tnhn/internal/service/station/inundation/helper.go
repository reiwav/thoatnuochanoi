package inundation

import (
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/rs/xid"
	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) getOrgFolderID(ctx context.Context, org *models.Organization) (string, error) {
	if org.DriveFolderID != "" {
		return org.DriveFolderID, nil
	}

	folderID, err := s.driveSvc.InitOrgFolders(ctx, org.Name, org.DriveFolderID)
	if err != nil {
		return "", fmt.Errorf("failed to ensure org folder for '%s': %w", org.Name, err)
	}

	if folderID != org.DriveFolderID {
		org.DriveFolderID = folderID
		_ = s.orgRepo.Upsert(ctx, org)
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

func (s *service) saveAndGetImages(images []ImageContent, reportID string) ([]string, error) {
	if len(images) > 0 {
		var imagesSave = make([]string, 0)
		savedPaths, err := s.saveLocalImages(fmt.Sprintf("%s_%d", reportID, time.Now().UnixNano()), images)
		if err != nil {
			return nil, err
		}
		for _, path := range savedPaths {
			imagesSave = append(imagesSave, "local:"+path)
		}
		return imagesSave, err
	}
	return nil, nil
}

// getFloodLevels returns cached FloodLevel settings, refreshing from DB if expired or empty.
func (s *service) getFloodLevels(ctx context.Context) []models.FloodLevel {
	levels, err := s.settingSvc.GetFloodLevels(ctx)
	if err != nil {
		return nil
	}
	return levels
}

func (s *service) calculateFloodLevel(ctx context.Context, depth float64) *models.FloodLevel {
	levels := s.getFloodLevels(ctx)
	return calculateFloodLevelFromLevels(depth, levels)
}

// calculateFloodLevelFromLevels uses a pre-loaded FloodLevels slice (pure in-memory, no DB).
func calculateFloodLevelFromLevels(depth float64, levels []models.FloodLevel) *models.FloodLevel {
	for i := range levels {
		level := levels[i]
		if depth >= level.MinDepth && depth < level.MaxDepth {
			return &level
		}
	}
	return nil
}

func (s *service) createNewResolvedNormalReport(ctx context.Context, station *models.InundationStation, endTime int64) (string, error) {
	newNormReportID := "inrep" + xid.New().String()
	newNormReport := &models.InundationReport{
		BaseModel: model.BaseModel{
			ID: newNormReportID,
		},
		PointID:    station.ID,
		StreetName: station.Name,
		OrgID:      station.OrgID,
		Status:     "resolved",
		HasFlooded: false,
		EndTime:    endTime,
	}
	newNormReport.IsFlooding = false
	err := s.InundationReportRepo.R_Create(ctx, newNormReport)
	if err != nil {
		return "", err
	}
	return newNormReportID, nil
}

func (s *service) checkReportAccessPermission(ctx context.Context, user *models.User, report *models.InundationReport, checkAssignment bool) error {
	isAllowedAll := user.Role == "super_admin" || user.IsCompany
	if isAllowedAll {
		return nil
	}

	isAuthorized := report.OrgID == user.OrgID
	if !isAuthorized {
		point, err := s.inundationStationRepo.GetByID(ctx, report.PointID)
		if err == nil && point != nil {
			if user.OrgID != "" {
				for _, sid := range point.SharedOrgIDs {
					if sid == user.OrgID {
						isAuthorized = true
						break
					}
				}
			}
			if !isAuthorized && checkAssignment && user.IsEmployee {
				for _, pid := range user.AssignedInundationStationIDs {
					if pid == point.ID {
						isAuthorized = true
						break
					}
				}
			}
		}
	}

	if !isAuthorized {
		return web.Unauthorized("Bạn không có quyền truy cập hoặc chỉnh sửa báo cáo này!")
	}
	return nil
}

func (s *service) createHistoryAndEnqueueSync(ctx context.Context, reportID string, user *models.User, rolePermission string, depth float64, width, length string, note string, images []string) (*models.InundationHistory, error) {
	report, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return nil, err
	}

	history := &models.InundationHistory{
		BaseModel: model.BaseModel{
			ID: "repup" + xid.New().String(),
		},
		InundationId:   report.PointID,
		ReportId:       reportID,
		UserId:         user.ID,
		UserName:       user.Name,
		UserEmail:      user.Email,
		OrgId:          user.OrgID,
		OrgName:        s.getOrgName(ctx, user.OrgID),
		RolePermission: rolePermission,
		Depth:          depth,
		Width:          width,
		Length:         length,
		Note:           note,
		Images:         images,
	}

	level := s.calculateFloodLevel(ctx, depth)
	if level != nil {
		history.FloodLevelName = level.Name
		history.FloodLevelColor = level.Color
		history.TrafficStatus = level.Name
	} else if depth == 0 {
		history.FloodLevelName = "Bình thường"
		history.FloodLevelColor = "#10b981"
		history.TrafficStatus = "Bình thường"
	}

	err = s.inundationHistoryRepo.Create(ctx, history)
	if err != nil {
		return nil, err
	}

	if s.syncWorker != nil {
		s.syncWorker.Enqueue(reportID, TaskTypeReport)
		s.syncWorker.Enqueue(history.ID, TaskTypeUpdate)
	}

	return history, nil
}

func (s *service) getUserPermission(ctx context.Context, defaultPerm string) string {
	if perms, ok := ctx.Value("permissions").([]string); ok {
		// Ưu tiên check enterprise_report trước
		for _, p := range perms {
			if p == "inundation:enterprise_report" {
				return "inundation:enterprise_report"
			}
		}
		for _, p := range perms {
			if p == "inundation:report" {
				return "inundation:report"
			}
		}
	}
	return defaultPerm
}

func (s *service) getOrgName(ctx context.Context, orgID string) string {
	if orgID == "" {
		return ""
	}
	org, err := s.orgRepo.GetByID(ctx, orgID)
	if err != nil || org == nil {
		return ""
	}
	return org.Name
}

func (s *service) updateMaxFloodDepth(ctx context.Context, report *models.InundationReport) error {
	var histories []models.InundationHistory

	filterVal := bson.M{
		"report_id":       report.ID,
		"role_permission": "inundation:enterprise_report",
	}

	// Query DB directly to find the deepest record
	err := s.inundationHistoryRepo.R_SelectAndSort(ctx, filterVal, bson.M{"depth": -1}, 0, 1, &histories)
	if err != nil {
		return err
	}

	if len(histories) > 0 {
		report.MaxDepth = histories[0].Depth
		report.MaxLength = histories[0].Length
		report.MaxWidth = histories[0].Width
	} else {
		report.MaxDepth = 0
		report.MaxLength = ""
		report.MaxWidth = ""
	}

	return nil
}
