package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
	"sync"
	"time"
)

type Service interface {
	ReportEnterprise(ctx context.Context, user *models.User, pointID string, report models.ReportEnterpriseBase, images []ImageContent) (*models.InundationReport, error)
	ReportEnterpriseSituation(ctx context.Context, user *models.User, pointID string, update dto.AddUpdateSitutionRequest, images []ImageContent) (*models.InundationReport, error)
	ListReports(ctx context.Context, orgID string) ([]*models.InundationReport, int64, error)
	ListReportsWithFilter(ctx context.Context, user *models.User, isAllowedAll bool, orgIDFilter string, f filter.Filter) ([]*models.InundationReport, int64, error)
	GetPointHistory(ctx context.Context, pointID string, lastReportID string, size int) ([]*models.InundationHistory, int64, error)
	GetReport(ctx context.Context, user *models.User, reportID string) (*models.InundationReport, error)
	ListReportHistory(ctx context.Context, reportID string) ([]models.InundationHistory, error)
	QuickFinishV2(ctx context.Context, user *models.User, pointID string) error
	CorrectEnterpriseReport(ctx context.Context, user *models.User, pointID string, report *models.ReportEnterpriseBase, images []ImageContent) error
	ReportSurvey(ctx context.Context, user *models.User, pointID string, report *models.ReportSurveyBase, images []ImageContent) error
	ReportMech(ctx context.Context, user *models.User, pointID string, report *models.ReportMechBase, images []ImageContent) error
	ReportKTCL(ctx context.Context, user *models.User, pointID string, report *models.ReportKTCLBase, images []ImageContent) error

	// Review and Correction
	ReviewReport(ctx context.Context, user *models.User, reportID, comment string) error
	ReviewUpdate(ctx context.Context, user *models.User, updateID, comment string) error
	GetHistoryByID(ctx context.Context, historyID string) (*models.InundationHistory, error)
	CorrectEnterpriseSituation(ctx context.Context, user *models.User, pointID string, update dto.AddUpdateSitutionRequest, images []ImageContent) error

	// Points management
	GetPointsStatus(ctx context.Context, user *models.User, isAllowedAll bool, orgIDFilter string) ([]PointStatus, error)
	GetPointByID(ctx context.Context, id string) (*models.InundationStation, error)
	CreatePoint(ctx context.Context, point models.InundationStation) (string, error)
	UpdatePoint(ctx context.Context, id string, point *models.InundationStation) error
	ListPointsByOrg(ctx context.Context, orgID string) ([]models.InundationStation, error)
	DeletePoint(ctx context.Context, id string) error

	// Yearly history reporting
	GetYearlyHistory(ctx context.Context, orgID string, year int) ([]*models.InundationReport, error)
	ExportYearlyHistory(ctx context.Context, orgID string, year int) (string, error)

	// Summary for external consumers
	GetInundationSummary(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string) (*InundationSummaryData, error)

	// SSE Hub
	GetHub() *Hub

	// Cache management
	UpdateFloodLevelCache(levels []models.FloodLevel)
}

type service struct {
	InundationReportRepo  repository.InundationReport
	inundationHistoryRepo repository.InundationHistory
	inundationStationRepo repository.InundationStation
	orgRepo               repository.Organization
	driveSvc              googledrive.Service
	folderCache           map[string]string
	cacheMu               sync.RWMutex
	syncWorker            *SyncWorker
	settingSvc            repository.AppSetting
	hub                   *Hub

	// In-memory cache for FloodLevel settings (TTL-based)
	floodLevelCache    []models.FloodLevel
	floodLevelCacheAt  time.Time
	floodLevelCacheTTL time.Duration
}

func NewService(
	inundationRepo repository.InundationReport,
	inundationHistoryRepo repository.InundationHistory,
	inundationStationRepo repository.InundationStation,
	orgRepo repository.Organization,
	driveSvc googledrive.Service,
	settingRepo repository.AppSetting,
) Service {
	svc := &service{
		InundationReportRepo:  inundationRepo,
		inundationHistoryRepo: inundationHistoryRepo,
		inundationStationRepo: inundationStationRepo,
		orgRepo:               orgRepo,
		driveSvc:              driveSvc,
		settingSvc:            settingRepo,
		folderCache:           make(map[string]string),
		hub:                   NewHub(),
		floodLevelCacheTTL:    5 * time.Minute,
	}

	svc.syncWorker = NewSyncWorker(inundationRepo, inundationHistoryRepo, orgRepo, driveSvc, svc.resolveUploadFolder)
	svc.syncWorker.Start()

	return svc
}

// GetHub returns the SSE Hub for handler use
func (s *service) GetHub() *Hub {
	return s.hub
}

// notifyPointChange broadcasts an SSE event to subscribers related to the given point
func (s *service) notifyPointChange(pointID string) {
	if s.hub == nil || pointID == "" {
		return
	}
	// Use background context for async notification to avoid issues with request context cancellation
	ctx := context.Background()
	point, err := s.inundationStationRepo.GetByID(ctx, pointID)
	if err != nil || point == nil {
		return
	}
	s.hub.NotifyPointChange(PointChangeInfo{
		PointID:      point.ID,
		OrgID:        point.OrgID,
		SharedOrgIDs: point.SharedOrgIDs,
		ShareAll:     point.ShareAll,
	})
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
