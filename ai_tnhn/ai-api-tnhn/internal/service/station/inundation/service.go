package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
	"sync"
)

type Service interface {
	CreateReport(ctx context.Context, user *models.User, report models.InundationReportBase, images []ImageContent) (*models.InundationReport, error)
	UpdateUpdateSitution(ctx context.Context, user *models.User, reportID string, update dto.AddUpdateSitutionRequest, images []ImageContent) (*models.InundationReport, error)
	ListReports(ctx context.Context, orgID string) ([]*models.InundationReport, int64, error)
	ListReportsWithFilter(ctx context.Context, user *models.User, isAllowedAll bool, orgIDFilter string, f filter.Filter) ([]*models.InundationReport, int64, error)
	GetReport(ctx context.Context, user *models.User, reportID string) (*models.InundationReport, error)
	ListReportUpdates(ctx context.Context, reportID string) ([]models.InundationUpdate, error)
	QuickFinishV2(ctx context.Context, user *models.User, reportID string) error
	UpdateReport(ctx context.Context, user *models.User, id string, report *models.InundationReportBase, images []ImageContent) error
	UpdateSurvey(ctx context.Context, user *models.User, id string, report *models.ReportSurveyBase, images []ImageContent) error
	UpdateMech(ctx context.Context, user *models.User, id string, report *models.ReportMechBase, images []ImageContent) error

	// Review and Correction
	ReviewReport(ctx context.Context, user *models.User, reportID, comment string) error
	ReviewUpdate(ctx context.Context, user *models.User, updateID, comment string) error
	GetUpdateByID(ctx context.Context, updateID string) (*models.InundationUpdate, error)
	//UpdateUpdateContent(ctx context.Context, user *models.User, update *models.InundationUpdate, images []ImageContent) error
	UpdateUpdateContent2(ctx context.Context, user *models.User, reportID string, update dto.AddUpdateSitutionRequest, images []ImageContent) error

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
	hub                   *Hub
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
		hub:                   NewHub(),
	}

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
