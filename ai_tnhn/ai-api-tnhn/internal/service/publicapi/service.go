package publicapi

import (
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/repository"
	"context"
)

type Service interface {
	GetStationsMasterList(ctx context.Context, stationType string) ([]dto.PublicStationMaster, error)
	GetPublicWaterData(ctx context.Context, stationType, stationID, dateStr string) ([]dto.PublicWaterData, error)
	GetPublicRainData(ctx context.Context, stationID, dateStr string) ([]dto.PublicRainData, error)
	GetPublicInundationData(ctx context.Context, stationID, dateStr string) ([]dto.PublicInundationData, error)
	GetPublicSluiceGateData(ctx context.Context, stationID, dateStr string) ([]dto.PublicSluiceGateData, error)
	GetPublicWastewaterData(ctx context.Context, stationID, dateStr string) ([]dto.PublicWastewaterData, error)
}

type service struct {
	lakeStationRepo   repository.LakeStation
	riverStationRepo  repository.RiverStation
	rainStationRepo   repository.RainStation
	inuStationRepo    repository.InundationStation
	sluiceGateRepo    repository.SluiceGate
	wastewaterRepo    repository.WastewaterStation
	
	lakeRepo          repository.Lake
	riverRepo         repository.River
	rainRepo          repository.Rain
	inuReportRepo     repository.InundationReport
	inuHistoryRepo    repository.InundationHistory
}

func NewService(
	lakeStationRepo repository.LakeStation,
	riverStationRepo repository.RiverStation,
	rainStationRepo repository.RainStation,
	inuStationRepo repository.InundationStation,
	sluiceGateRepo repository.SluiceGate,
	wastewaterRepo repository.WastewaterStation,
	lakeRepo repository.Lake,
	riverRepo repository.River,
	rainRepo repository.Rain,
	inuReportRepo repository.InundationReport,
	inuHistoryRepo repository.InundationHistory,
) Service {
	return &service{
		lakeStationRepo:   lakeStationRepo,
		riverStationRepo:  riverStationRepo,
		rainStationRepo:   rainStationRepo,
		inuStationRepo:    inuStationRepo,
		sluiceGateRepo:    sluiceGateRepo,
		wastewaterRepo:    wastewaterRepo,
		lakeRepo:          lakeRepo,
		riverRepo:         riverRepo,
		rainRepo:          rainRepo,
		inuReportRepo:     inuReportRepo,
		inuHistoryRepo:    inuHistoryRepo,
	}
}
