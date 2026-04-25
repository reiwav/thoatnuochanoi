package report

import (
	"ai-api-tnhn/config"
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/internal/service/google/googledrive"
	"context"
)

type Service interface {
	GenerateQuickReportV3(ctx context.Context, userID string) (*QuickReportResult, error)
	GenerateQuickReportText(ctx context.Context, userID string) (string, error)
	GenerateAIDynamicReport(ctx context.Context, userID string) (string, error)
}

type service struct {
	cfg           *config.Config
	log           logger.Logger
	googleSvc     googleapi.Service
	driveSvc      googledrive.Service
	aiChatLogRepo repository.AiChatLog
}

func NewService(cfg *config.Config, log logger.Logger, googleSvc googleapi.Service, driveSvc googledrive.Service, aiChatLogRepo repository.AiChatLog) Service {
	return &service{
		cfg:           cfg,
		log:           log,
		googleSvc:     googleSvc,
		driveSvc:      driveSvc,
		aiChatLogRepo: aiChatLogRepo,
	}
}
