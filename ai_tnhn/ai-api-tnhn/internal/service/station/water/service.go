package water

import (
	"ai-api-tnhn/internal/base/logger"
	"ai-api-tnhn/internal/integration/thoatnuoc"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/setting"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/station/water/dto"
	"ai-api-tnhn/internal/service/station/water/grid"
	"ai-api-tnhn/internal/service/station/water/records"
	"ai-api-tnhn/internal/service/station/water/summary"
	"ai-api-tnhn/internal/service/station/water/worker"
	"ai-api-tnhn/internal/service/weather"
	"context"
	"time"
)

// Re-export DTO types as aliases for backward compatibility across the codebase
type (
	WaterStationStat       = dto.WaterStationStat
	WaterSummaryData       = dto.WaterSummaryData
	GridRowData            = dto.GridRowData
	GridDataResponseItem   = dto.GridDataResponseItem
	SingleWaterRecordInput = dto.SingleWaterRecordInput
	LatestWaterRecord      = dto.LatestWaterRecord
	WaterStationV2         = dto.WaterStationV2
	WaterRecordInfo        = dto.WaterRecordInfo
	WaterWorker            = worker.Worker
)

// Service defines the aggregated interface for all water station operations
type Service interface {
	records.Service
	grid.Service
	summary.Service
}

type service struct {
	recordsSvc records.Service
	gridSvc    grid.Service
	summarySvc summary.Service
}

// NewService constructs the aggregated water service from sub-feature modules
func NewService(
	l logger.Logger,
	lake repository.Lake,
	river repository.River,
	stationSvc station.Service,
	weatherSvc weather.Service,
	waterThresholdSvc setting.WaterThresholdService,
) Service {
	recSvc := records.NewService(l, lake, river, stationSvc, waterThresholdSvc)
	gridSvc := grid.NewService(lake, river, recSvc)
	sumSvc := summary.NewService(lake, river, stationSvc, waterThresholdSvc)

	return &service{
		recordsSvc: recSvc,
		gridSvc:    gridSvc,
		summarySvc: sumSvc,
	}
}

// NewWaterWorker constructs a new WaterWorker instance
func NewWaterWorker(
	l logger.Logger,
	riverRepo repository.River,
	lakeRepo repository.Lake,
	waterSvc Service,
	stationSvc station.Service,
	thoatnuocSvc thoatnuoc.Service,
) WaterWorker {
	return worker.NewWorker(l, riverRepo, lakeRepo, waterSvc, stationSvc, thoatnuocSvc)
}

// Delegate Records Service methods
func (s *service) GetLakeDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error) {
	return s.recordsSvc.GetLakeDataByStation(ctx, stationID, limit, date)
}

func (s *service) GetRiverDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error) {
	return s.recordsSvc.GetRiverDataByStation(ctx, stationID, limit, date)
}

func (s *service) GetLakeDataByDate(ctx context.Context, date string) ([]*models.LakeRecord, error) {
	return s.recordsSvc.GetLakeDataByDate(ctx, date)
}

func (s *service) GetRiverDataByDate(ctx context.Context, date string) ([]*models.RiverRecord, error) {
	return s.recordsSvc.GetRiverDataByDate(ctx, date)
}

func (s *service) CreateLakeRecord(ctx context.Context, record *models.LakeRecord, user *models.User) error {
	return s.recordsSvc.CreateLakeRecord(ctx, record, user)
}

func (s *service) CreateRiverRecord(ctx context.Context, record *models.RiverRecord, user *models.User) error {
	return s.recordsSvc.CreateRiverRecord(ctx, record, user)
}

// Delegate Grid Service methods
func (s *service) UpsertSingleWaterRecord(ctx context.Context, input *dto.SingleWaterRecordInput, user *models.User) (string, error) {
	return s.gridSvc.UpsertSingleWaterRecord(ctx, input, user)
}

func (s *service) GetGridDataByTimeRange(ctx context.Context, startTime, endTime time.Time, date string) ([]dto.GridDataResponseItem, error) {
	return s.gridSvc.GetGridDataByTimeRange(ctx, startTime, endTime, date)
}

// Delegate Summary Service methods
func (s *service) GetWaterSummary(ctx context.Context, orgID string, assignedIDs []string) (*dto.WaterSummaryData, error) {
	return s.summarySvc.GetWaterSummary(ctx, orgID, assignedIDs)
}

func (s *service) GetWaterSummaryV2(ctx context.Context) ([]dto.WaterStationV2, error) {
	return s.summarySvc.GetWaterSummaryV2(ctx)
}
