package inundation

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"time"
)

func (s *service) QuickFinishV2(ctx context.Context, user *models.User, pointID string) error {
	station, err := s.inundationStationRepo.GetByID(ctx, pointID)
	if err != nil {
		return err
	}
	reportID := station.ReportID
	if reportID == "" {
		return web.BadRequest("Không tìm thấy báo cáo")
	}
	existing, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return err
	}

	now := time.Now().Unix()
	existing.Status = constant.InundationStatusResolved
	existing.IsFlooding = false
	existing.TrafficStatus = "Bình thường"
	existing.FloodLevelName = "Bình thường"
	existing.FloodLevelColor = "#10b981"
	existing.EndTime = now

	newHistory, err := s.createHistoryAndEnqueueSync(ctx, reportID, user, s.getUserPermission(ctx, "inundation:enterprise_report"), 0, "", "", "Kết thúc nhanh đợt ngập", nil)
	if err != nil {
		return err
	}

	existing.EnterpriseHistoryID = newHistory.ID

	_ = s.updateMaxFloodDepth(ctx, existing)

	err = s.InundationReportRepo.Update(ctx, existing)
	if err != nil {
		return err
	}

	// Create a new resolved normal report representing post-flood normal state
	newNormReportID, err := s.createNewResolvedNormalReport(ctx, station, now)
	if err != nil {
		return err
	}

	station.ReportID = ""
	station.LastReportID = newNormReportID
	err = s.inundationStationRepo.Update(ctx, station)
	if err != nil {
		return err
	}

	// Notify SSE subscribers about the change
	go s.notifyPointChange(pointID)

	return nil
}

func (s *service) subFinish(ctx context.Context, pointID string, report *models.InundationReport, endTime int64) error {
	station, err := s.inundationStationRepo.GetByID(ctx, pointID)
	if err != nil {
		return err
	}
	if station == nil {
		return nil
	}

	// Đóng băng và đánh dấu báo cáo đợt ngập hiện tại thành "đã kết thúc" (resolved) để lưu trữ lịch sử
	report.Status = constant.InundationStatusResolved
	report.IsFlooding = false

	// Lấy thông tin mức ngập khi không ngập (độ sâu 0) từ config để gán cho báo cáo kết thúc
	level := s.calculateFloodLevel(ctx, 0)
	if level != nil {
		report.TrafficStatus = level.Name
		report.FloodLevelName = level.Name
		report.FloodLevelColor = level.Color
	} else {
		report.TrafficStatus = "Bình thường"
		report.FloodLevelName = "Bình thường"
		report.FloodLevelColor = "#10b981"
	}
	report.EndTime = endTime

	// Tính toán và lưu độ sâu ngập lớn nhất đã xảy ra trong suốt đợt ngập này
	_ = s.updateMaxFloodDepth(ctx, report)

	// Cập nhật báo cáo đợt ngập đã kết thúc vào database
	err = s.InundationReportRepo.Update(ctx, report)
	if err != nil {
		return err
	}

	// Tạo mới một báo cáo trạng thái bình thường sạch (resolved, HasFlooded = false) làm mốc hiện tại cho trạm
	newNormReportID, err := s.createNewResolvedNormalReport(ctx, station, endTime)
	if err != nil {
		return err
	}

	// Xóa ReportID active để báo hiệu điểm này không còn ngập nữa
	station.ReportID = ""
	// Trỏ LastReportID sang báo cáo bình thường mới tạo để UI hiển thị trạng thái sạch (độ sâu 0, màu xanh)
	station.LastReportID = newNormReportID
	// Cập nhật thông tin điểm ngập vào database
	err = s.inundationStationRepo.Update(ctx, station)
	if err != nil {
		return err
	}

	return nil
}

