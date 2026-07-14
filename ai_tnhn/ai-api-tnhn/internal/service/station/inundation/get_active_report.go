package inundation

import (
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"

	"github.com/rs/xid"
)

// getOrCreateActiveReport retrieves the active report for a point,
// or reactivates/creates one based on whether the input depth represents flooding.
func (s *service) getOrCreateActiveReport(ctx context.Context, pointID string, depth float64) (*models.InundationReport, error) {
	report, err := s.getOrCreateActiveReportRaw(ctx, pointID, depth)
	if err != nil {
		return nil, err
	}
	if report != nil {
		_ = s.fillReportBases(ctx, report)
	}
	return report, nil
}

func (s *service) getOrCreateActiveReportRaw(ctx context.Context, pointID string, depth float64) (*models.InundationReport, error) {
	station, err := s.inundationStationRepo.GetByID(ctx, pointID)
	if err != nil {
		return nil, err
	}
	if station == nil {
		return nil, fmt.Errorf("không tìm thấy điểm ngập")
	}

	// Calculate if the input depth represents flooding
	level := s.calculateFloodLevel(ctx, depth)
	isInputFlooding := level != nil && level.IsFlooding

	// 1. Nếu trạm đang ngập (có ReportID active)
	if station.ReportID != "" {
		report, err := s.InundationReportRepo.GetByID(ctx, station.ReportID)
		if err == nil && report != nil && report.Status == "active" {
			return report, nil
		}
	}

	// 2. Nếu trạm đang bình thường, và dữ liệu mới gửi lên là ngập lụt
	if isInputFlooding {
		return s.getOrCreateActiveReportForFlooding(ctx, station)
	}

	// 3. Nếu dữ liệu gửi lên là bình thường (không ngập), và trạm đang bình thường
	return s.getOrCreateReportForNormal(ctx, station)
}

func (s *service) getOrCreateActiveReportForFlooding(ctx context.Context, station *models.InundationStation) (*models.InundationReport, error) {
	if station.LastReportID != "" {
		report, err := s.InundationReportRepo.GetByID(ctx, station.LastReportID)
		if err == nil && report != nil && report.HasFlooded {
			// Kích hoạt lại báo cáo cũ đã từng ngập
			report.Status = "active"
			report.EndTime = 0
			report.IsFlooding = true

			err = s.InundationReportRepo.Update(ctx, report)
			if err != nil {
				return nil, err
			}

			// Cập nhật lại station
			station.ReportID = report.ID
			_ = s.inundationStationRepo.Update(ctx, station)

			return report, nil
		}
	}

	// Tạo mới báo cáo active
	reportID := "inrep" + xid.New().String()
	report := &models.InundationReport{
		BaseModel: model.BaseModel{
			ID: reportID,
		},
		PointID:    station.ID,
		StreetName: station.Name,
		OrgID:      station.OrgID,
		Status:     "active",
		HasFlooded: true,
	}
	report.IsFlooding = true

	err := s.InundationReportRepo.R_Create(ctx, report)
	if err != nil {
		return nil, err
	}

	// Cập nhật station
	station.ReportID = report.ID
	station.LastReportID = report.ID
	_ = s.inundationStationRepo.Update(ctx, station)

	return report, nil
}

func (s *service) getOrCreateReportForNormal(ctx context.Context, station *models.InundationStation) (*models.InundationReport, error) {
	if station.LastReportID != "" {
		report, err := s.InundationReportRepo.GetByID(ctx, station.LastReportID)
		if err == nil && report != nil {
			return report, nil
		}
	}

	// Chưa có báo cáo nào, tạo một báo cáo đã kết thúc (resolved) để ghi log
	reportID := "inrep" + xid.New().String()
	report := &models.InundationReport{
		BaseModel: model.BaseModel{
			ID: reportID,
		},
		PointID:    station.ID,
		StreetName: station.Name,
		OrgID:      station.OrgID,
		Status:     "resolved",
	}
	report.IsFlooding = false

	err := s.InundationReportRepo.R_Create(ctx, report)
	if err != nil {
		return nil, err
	}

	// Cập nhật station (LastReportID để ghi lịch sử, ReportID trống vì không ngập)
	station.LastReportID = report.ID
	_ = s.inundationStationRepo.Update(ctx, station)

	return report, nil
}
