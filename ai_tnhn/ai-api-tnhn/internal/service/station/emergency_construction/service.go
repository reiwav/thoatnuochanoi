package emergency_construction

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
	"sync"
)

type Service interface {
	Create(ctx context.Context, item *models.EmergencyConstruction, userID string) error
	Update(ctx context.Context, id string, item *models.EmergencyConstruction, userID string) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.EmergencyConstruction, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstruction, int64, error)
	ListHistory(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstructionProgress, int64, error)
	GetHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionHistory, error)

	// Progress Reporting
	ReportProgress(ctx context.Context, progress *models.EmergencyConstructionProgress, images []ImageContent) error
	UpdateProgress(ctx context.Context, id string, progress *models.EmergencyConstructionProgress, images []ImageContent) error
	GetProgressByID(ctx context.Context, id string) (*models.EmergencyConstructionProgress, error)
	GetProgressHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionProgress, error)
	ExportExcelToDrive(ctx context.Context, date string, orgID string) (string, error)
	ExportProgressToExcel(ctx context.Context, progressID string) (string, error)
	GetUnfinishedProgressHistory(ctx context.Context) ([]*models.EmergencyConstructionProgress, error)
	TestExcelImageImport(ctx context.Context, driveLink string) (string, error)
	GetUserByID(ctx context.Context, id string) (*models.User, error)
	GetOrgByID(ctx context.Context, id string) (*models.Organization, error)
}

type service struct {
	repo         repository.EmergencyConstruction
	historyRepo  repository.EmergencyConstructionHistory
	progressRepo repository.EmergencyConstructionProgress
	userRepo     repository.User
	orgRepo      repository.Organization
	driveSvc     googledrive.Service
	folderCache  map[string]string
	cacheMu      sync.RWMutex
}

func NewService(repo repository.EmergencyConstruction, historyRepo repository.EmergencyConstructionHistory, progressRepo repository.EmergencyConstructionProgress, userRepo repository.User, orgRepo repository.Organization, driveSvc googledrive.Service) Service {
	return &service{
		repo:         repo,
		historyRepo:  historyRepo,
		progressRepo: progressRepo,
		userRepo:     userRepo,
		orgRepo:      orgRepo,
		driveSvc:     driveSvc,
		folderCache:  make(map[string]string),
	}
}
