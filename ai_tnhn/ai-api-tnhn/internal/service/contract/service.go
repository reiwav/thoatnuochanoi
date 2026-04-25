package contract

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
	"io"
)

type Service interface {
	Create(ctx context.Context, contract *models.Contract) error
	Update(ctx context.Context, id string, contract *models.Contract) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.Contract, error)
	List(ctx context.Context, f filter.Filter) ([]*models.Contract, int64, error)
	UploadFile(ctx context.Context, id string, name, mimeType string, content io.Reader) (string, error)
	UploadToFolder(ctx context.Context, folderID, name, mimeType string, content io.Reader) (string, error)
	DeleteDriveFile(ctx context.Context, fileID string) error
	PrepareDriveFolder(ctx context.Context, orgID, categoryID, name string) (string, string, error)

	// AI query methods
	GetContractSummary(ctx context.Context) (*ContractSummaryStats, error)
	GetExpiringSoon(ctx context.Context, days int) ([]*ContractQueryResult, error)
	GetExpired(ctx context.Context) ([]*ContractQueryResult, error)
	GetStagesDueSoon(ctx context.Context, days int) ([]*StageQueryResult, error)
	GetStagesPassed(ctx context.Context) ([]*StageQueryResult, error)
	SearchContracts(ctx context.Context, keyword string) ([]*ContractQueryResult, error)
}

type service struct {
	repo     repository.Contract
	catRepo  repository.ContractCategory
	orgRepo  repository.Organization
	driveSvc googledrive.Service
}

func NewService(repo repository.Contract, catRepo repository.ContractCategory, orgRepo repository.Organization, driveSvc googledrive.Service) Service {
	return &service{repo: repo, catRepo: catRepo, orgRepo: orgRepo, driveSvc: driveSvc}
}
