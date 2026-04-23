package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
	"fmt"
	"io"
	"sort"
	"sync"
	"time"

	"os"
	"path/filepath"
)

type Service interface {
	CreateReport(ctx context.Context, user *models.User, report models.InundationReportBase, images []ImageContent) (*models.InundationReport, error)
	AddUpdate(ctx context.Context, user *models.User, reportID string, update *models.InundationUpdate, images []ImageContent, resolve bool) error
	ListReports(ctx context.Context, orgID string) ([]*models.InundationReport, int64, error)
	ListReportsWithFilter(ctx context.Context, user *models.User, isAllowedAll bool, orgIDFilter string, f filter.Filter) ([]*models.InundationReport, int64, error)
	GetReport(ctx context.Context, user *models.User, reportID string) (*models.InundationReport, error)
	Resolve(ctx context.Context, reportID string, endTime int64) error
	QuickFinish(ctx context.Context, user *models.User, pointID string) error
	UpdateReport(ctx context.Context, user *models.User, id string, report *models.InundationReportBase, images []ImageContent) error
	UpdateSurvey(ctx context.Context, user *models.User, id string, report *models.ReportSurveyBase, images []ImageContent) error
	UpdateMech(ctx context.Context, user *models.User, id string, report *models.ReportMechBase, images []ImageContent) error

	// Review and Correction
	ReviewReport(ctx context.Context, user *models.User, reportID, comment string) error
	ReviewUpdate(ctx context.Context, user *models.User, updateID, comment string) error
	GetUpdateByID(ctx context.Context, updateID string) (*models.InundationUpdate, error)
	UpdateUpdateContent(ctx context.Context, user *models.User, update *models.InundationUpdate, images []ImageContent) error

	// Points management
	GetPointsStatus(ctx context.Context, user *models.User, isAllowedAll bool, orgIDFilter string) ([]PointStatus, error)
	GetPointByID(ctx context.Context, id string) (*models.InundationStation, error)
	CreatePoint(ctx context.Context, point models.InundationStation) (string, error)
	UpdatePoint(ctx context.Context, id string, point models.InundationStation) error
	ListPointsByOrg(ctx context.Context, user *models.User, isAllowedAll bool, orgIDFilter string) ([]models.InundationStation, error)
	DeletePoint(ctx context.Context, id string) error

	// Yearly history reporting
	GetYearlyHistory(ctx context.Context, orgID string, year int) ([]*models.InundationReport, error)
	ExportYearlyHistory(ctx context.Context, orgID string, year int) (string, error)

	// Summary for external consumers
	GetInundationSummary(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string) (*InundationSummaryData, error)
}

type InundationUpdateStat struct {
	Timestamp   string  `json:"timestamp"`
	Description string  `json:"description"`
	Depth       float64 `json:"depth"`
}

type InundationStationStat struct {
	StreetName    string                 `json:"street_name"`
	OrgName       string                 `json:"org_name"`
	Depth         float64                `json:"depth"`
	Width         string                 `json:"width"`
	Length        string                 `json:"length"`
	StartTime     string                 `json:"start_time"`
	Description   string                 `json:"description"`
	CurrentStatus string                 `json:"current_status"`
	Updates       []InundationUpdateStat `json:"updates"`
}

type InundationSummaryData struct {
	ActivePoints  int                     `json:"active_points"`
	OngoingPoints []InundationStationStat `json:"ongoing_points"`
}

type PointStatus struct {
	models.InundationStation
	Status       string                   `json:"status"`
	OrgName      string                   `json:"org_name"`
	ActiveReport *models.InundationReport `json:"active_report,omitempty"`
	LastReport   *models.InundationReport `json:"last_report,omitempty"`
}

type ImageContent struct {
	Name     string
	MimeType string
	Reader   io.Reader
}

type service struct {
	InundationReportRepo  repository.InundationReport
	inundationUpdateRepo  repository.InundationUpdate
	inundationStationRepo repository.InundationStation
	orgRepo               repository.Organization
	driveSvc              googledrive.Service
	folderCache           map[string]string
	cacheMu               sync.RWMutex
	syncWorker            *SyncWorker
	settingSvc            repository.AppSetting
}

func NewService(
	inundationRepo repository.InundationReport,
	inundationUpdateRepo repository.InundationUpdate,
	inundationStationRepo repository.InundationStation,
	orgRepo repository.Organization,
	driveSvc googledrive.Service,
	settingRepo repository.AppSetting,
) Service {
	svc := &service{
		InundationReportRepo:  inundationRepo,
		inundationUpdateRepo:  inundationUpdateRepo,
		inundationStationRepo: inundationStationRepo,
		orgRepo:               orgRepo,
		driveSvc:              driveSvc,
		settingSvc:            settingRepo,
		folderCache:           make(map[string]string),
	}

	// 1. Initialize background sync worker
	// svc.syncWorker = NewSyncWorker(
	// 	inundationRepo,
	// 	inundationUpdateRepo,
	// 	orgRepo,
	// 	driveSvc,
	// 	svc.resolveUploadFolder, // Pass helper function
	// )

	// 2. Start the worker loop (Startup scan + channel listener)
	//svc.syncWorker.Start()

	return svc
}

func (s *service) getOrgFolderID(ctx context.Context, org *models.Organization) (string, error) {
	folderID := org.DriveFolderID
	// Treat empty or "." as invalid
	if folderID == "" || folderID == "." {
		fmt.Printf("Org %s has invalid DriveFolderID '%s'. Attempting to create/find a valid one...\n", org.Name, folderID)
		newFolderID, err := s.driveSvc.CreateOrgFolder(ctx, org.Name)
		if err != nil {
			return "", fmt.Errorf("failed to ensure org folder for '%s': %w", org.Name, err)
		}

		// Update org in DB so we don't have to keep doing this
		org.DriveFolderID = newFolderID
		_ = s.orgRepo.Upsert(ctx, org)
		return newFolderID, nil
	}
	return folderID, nil
}

// resolveUploadFolder dynamically determines the target Google Drive folder: Org -> FLOOD -> Station -> Year -> Month -> Day
func (s *service) resolveUploadFolder(ctx context.Context, org *models.Organization, dataType string, pointID string) (string, error) {
	// 1. Get Base Org Folder
	orgFolderID, err := s.getOrgFolderID(ctx, org)
	if err != nil {
		return "", err
	}

	now := time.Now()
	yearStr := now.Format("2006")
	monthStr := now.Format("01")
	dayStr := now.Format("02")

	// Use a hierarchical cache key to reflect the new structure
	dateKey := fmt.Sprintf("%s_%s_%s_%s_%s_%s", org.ID, dataType, pointID, yearStr, monthStr, dayStr)

	s.cacheMu.RLock()
	cachedID, ok := s.folderCache[dateKey]
	s.cacheMu.RUnlock()
	if ok {
		return cachedID, nil
	}

	// 2. Get/Create Type Folder (e.g., FLOOD)
	typeFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, orgFolderID, dataType)
	if err != nil {
		return "", fmt.Errorf("failed to handle type folder '%s': %w", dataType, err)
	}

	// 3. Get/Create Station Folder (e.g., Ngõ 123_ID...)
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

	// 4. Get/Create Year Folder
	yearFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, stationFolderID, yearStr)
	if err != nil {
		return "", fmt.Errorf("failed to handle year folder '%s': %w", yearStr, err)
	}

	// 5. Get/Create Month Folder
	monthFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, yearFolderID, monthStr)
	if err != nil {
		return "", fmt.Errorf("failed to handle month folder '%s': %w", monthStr, err)
	}

	// 6. Get/Create Date (Day) Folder
	dayFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, monthFolderID, dayStr)
	if err != nil {
		return "", fmt.Errorf("failed to handle day folder '%s': %w", dayStr, err)
	}

	if dayFolderID != "" {
		s.cacheMu.Lock()
		s.folderCache[dateKey] = dayFolderID
		s.cacheMu.Unlock()

		// Make the day folder public so files inside inherit the permission
		_ = s.driveSvc.SetPublic(ctx, dayFolderID)
	}

	return dayFolderID, nil
}

// saveLocalImages saves images to a temporary directory on disk and returns the relative paths
func (s *service) saveLocalImages(prefix string, images []ImageContent) ([]string, error) {
	baseDir := "uploads/inundation_tmp"
	if _, err := os.Stat(baseDir); os.IsNotExist(err) {
		_ = os.MkdirAll(baseDir, 0755)
	}

	var savedPaths []string
	for i, img := range images {
		// Use a unique name to avoid collisions
		fileName := fmt.Sprintf("%s_%d_%d%s", prefix, time.Now().UnixNano(), i, filepath.Ext(img.Name))
		if filepath.Ext(img.Name) == "" {
			// Fallback extension if missing
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

func (s *service) GetInundationSummary(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string) (*InundationSummaryData, error) {
	if orgID == "all" {
		orgID = ""
	}
	dummyUser := &models.User{
		OrgID:                        orgID,
		AssignedInundationStationIDs: assignedInuIDs,
		IsEmployee:                   !isAllowedAll && len(assignedInuIDs) > 0,
	}
	f := filter.NewPaginationFilter()
	f.Page = 1
	f.PerPage = 1000
	f.AddWhere("status", "status", "active")

	reports, _, err := s.ListReportsWithFilter(ctx, dummyUser, isAllowedAll, orgID, f)
	if err != nil {
		return nil, err
	}

	// Fetch all organizations once to map OrgID to OrgName efficiently
	orgs, _ := s.orgRepo.GetAll(ctx)
	orgMap := make(map[string]string)
	for _, org := range orgs {
		orgMap[org.ID] = org.Name
	}

	var ongoing []InundationStationStat
	for _, r := range reports {
		var updates []InundationUpdateStat
		for _, u := range r.Updates {
			updates = append(updates, InundationUpdateStat{
				Timestamp:   time.Unix(u.Timestamp, 0).Format("15:04 02/01/2006"),
				Description: u.Description,
				Depth:       u.Depth,
			})
		}

		ongoing = append(ongoing, InundationStationStat{
			StreetName:    r.StreetName,
			OrgName:       orgMap[r.OrgID],
			Depth:         r.Depth,
			Width:         r.Width,
			Length:        r.Length,
			StartTime:     time.Unix(r.StartTime, 0).Format("15:04 02/01/2006"),
			Description:   r.Description,
			CurrentStatus: "Đang ngập lụt",
			Updates:       updates,
		})
	}

	// Sort ongoing points by StreetName alphabetically
	sort.Slice(ongoing, func(i, j int) bool {
		return ongoing[i].StreetName < ongoing[j].StreetName
	})

	return &InundationSummaryData{
		ActivePoints:  len(ongoing),
		OngoingPoints: ongoing,
	}, nil
}

func (s *service) calculateFloodLevel(ctx context.Context, depth float64) *models.FloodLevel {
	setting, err := s.settingSvc.GetByCode(ctx, "FloodLevel")
	if err != nil || setting == nil {
		return nil
	}

	for _, level := range setting.FloodLevels {
		if depth >= level.MinDepth && depth < level.MaxDepth {
			return &level
		}
	}
	return nil
}
