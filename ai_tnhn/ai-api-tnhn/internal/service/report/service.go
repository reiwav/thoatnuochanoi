package report

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
	"time"
)

type Service interface {
	GenerateQuickReportV3(ctx context.Context, userID string, customTime *time.Time) (*QuickReportResult, error)
	GenerateQuickReportText(ctx context.Context, userID string) (*googleapi.ChatResponse, error)
	GenerateAIDynamicReport(ctx context.Context, userID string) (*googleapi.ChatResponse, error)
	GetWaterReportDetails(ctx context.Context, customTime *time.Time) (*WaterReportDetailResponse, error)
}

type service struct {
	cfg              *config.Config
	log              logger.Logger
	googleSvc        googleapi.Service
	driveSvc         googledrive.Service
	aiChatLogRepo    repository.AiChatLog
	rainStationRepo  repository.RainStation
	lakeStationRepo  repository.LakeStation
	riverStationRepo repository.RiverStation
	lakeRepo         repository.Lake
	riverRepo        repository.River
}

func NewService(
	cfg *config.Config,
	log logger.Logger,
	googleSvc googleapi.Service,
	driveSvc googledrive.Service,
	aiChatLogRepo repository.AiChatLog,
	rainStationRepo repository.RainStation,
	lakeStationRepo repository.LakeStation,
	riverStationRepo repository.RiverStation,
	lakeRepo repository.Lake,
	riverRepo repository.River,
) Service {
	return &service{
		cfg:              cfg,
		log:              log,
		googleSvc:        googleSvc,
		driveSvc:         driveSvc,
		aiChatLogRepo:    aiChatLogRepo,
		rainStationRepo:  rainStationRepo,
		lakeStationRepo:  lakeStationRepo,
		riverStationRepo: riverStationRepo,
		lakeRepo:         lakeRepo,
		riverRepo:        riverRepo,
	}
}
