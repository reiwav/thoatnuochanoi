package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"ai-api-tnhn/internal/service/setting"
	"context"
	"sync"
)

type Service interface {
	ReportEnterprise(ctx context.Context, user *models.User, pointID string, report models.ReportEnterpriseBase, images []ImageContent) (*models.InundationReport, error)
	ReportEnterpriseSituation(ctx context.Context, user *models.User, pointID string, update dto.AddUpdateSitutionRequest, images []ImageContent) (*models.InundationReport, error)
	ListReportsWithFilter(ctx context.Context, user *models.User, isAllowedAll bool, orgIDFilter string, f filter.Filter) ([]*models.InundationReport, int64, error)
	GetPointHistory(ctx context.Context, pointID string, lastReportID string, size int) ([]*models.InundationHistory, int64, error)
	GetReportHistory(ctx context.Context, reportID string) ([]*models.InundationHistory, int64, error)
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
	GetHistoryByDateRange(ctx context.Context, startDate, endDate, pointID string) ([]*models.InundationReport, error)
	ExportYearlyHistory(ctx context.Context, orgID string, year int) (string, error)

	// Summary for external consumers
	GetInundationSummary(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string) (*InundationSummaryData, error)
	GetInundationSummaryByDate(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string, dateStr string) (*InundationSummaryData, error)

	// SSE Hub
	GetHub() *Hub

	TriggerInitialSync()
}

type service struct {
	InundationReportRepo  repository.InundationReport
	inundationHistoryRepo repository.InundationHistory
	inundationStationRepo repository.InundationStation
	orgRepo               repository.Organization
	userRepo              repository.User
	driveSvc              googledrive.Service
	folderCache           map[string]string
	cacheMu               sync.RWMutex
	syncWorker            *SyncWorker
	settingSvc            setting.Service
	hub                   *Hub
}

func NewService(
	inundationRepo repository.InundationReport,
	inundationHistoryRepo repository.InundationHistory,
	inundationStationRepo repository.InundationStation,
	orgRepo repository.Organization,
	userRepo repository.User,
	driveSvc googledrive.Service,
	settingSvc setting.Service,
) Service {
	svc := &service{
		InundationReportRepo:  inundationRepo,
		inundationHistoryRepo: inundationHistoryRepo,
		inundationStationRepo: inundationStationRepo,
		orgRepo:               orgRepo,
		userRepo:              userRepo,
		driveSvc:              driveSvc,
		settingSvc:            settingSvc,
		folderCache:           make(map[string]string),
		hub:                   NewHub(),
	}

	svc.syncWorker = NewSyncWorker(inundationRepo, inundationHistoryRepo, orgRepo, driveSvc, svc.resolveUploadFolder)
	svc.syncWorker.Start()

	svc.startResetWorker()

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

func (s *service) TriggerInitialSync() {
	if s.syncWorker != nil {
		go s.syncWorker.syncLocalImages()
	}
}
