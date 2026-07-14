package inundation

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"time"
)

// ReportEnterprise handles updates or new inundation report creation by Enterprise (Địa bàn)
func (s *service) ReportEnterprise(ctx context.Context, user *models.User, pointID string, input models.ReportEnterpriseBase, images []ImageContent) (*models.InundationReport, error) {
	if pointID == "" {
		return nil, web.BadRequest("Point ID is required")
	}

	// 1. Permission Check
	err := s.validAssigned(user, pointID)
	if err != nil {
		return nil, err
	}

	// 2. Get or create active report
	report, err := s.getOrCreateActiveReport(ctx, pointID, input.Depth)
	if err != nil {
		return nil, err
	}

	// 3. Save images
	imagesSave, err := s.saveAndGetImages(images, report.ID)
	if err != nil {
		return nil, err
	}

	// 4. Update report content using the helper
	report, err = s.setAndUpdateReport(ctx, user, input, report, imagesSave)
	if err != nil {
		return nil, err
	}

	// 5. Create enterprise history record
	note := report.ReportEnterpriseBase.Description
	if note == "" {
		if report.IsFlooding {
			note = "Bắt đầu đợt ngập"
		} else {
			note = "Kiểm tra hiện trường (Chuẩn bị/Bình thường)"
		}
	}
	history, err := s.createHistoryAndEnqueueSync(ctx, report.ID, user, s.getUserPermission(ctx, "inundation:enterprise_report"), report.ReportEnterpriseBase.Depth, report.ReportEnterpriseBase.Width, report.ReportEnterpriseBase.Length, note, report.ReportEnterpriseBase.Images)
	if err != nil {
		return nil, err
	}

	// Update reference IDs in report
	report.EnterpriseHistoryID = history.ID
	if report.Status == constant.InundationStatusResolved {
		_ = s.updateMaxFloodDepth(ctx, report)
	}
	err = s.InundationReportRepo.Update(ctx, report)
	if err != nil {
		return nil, err
	}

	// Notify SSE
	go s.notifyPointChange(pointID)

	return report, nil
}

func (s *service) setAndUpdateReport(ctx context.Context, user *models.User,
	input models.ReportEnterpriseBase, report *models.InundationReport,
	images []string) (*models.InundationReport, error) {
	// Calculate Flood Level
	level := s.calculateFloodLevel(ctx, input.Depth)
	if level == nil {
		return nil, web.BadRequest("Flood level not found")
	}

	input.UserID = user.ID
	input.UserEmail = user.Email
	input.UserName = user.Name
	input.Images = images

	input.ReportBase.FloodLevelName = level.Name
	input.ReportBase.FloodLevelColor = level.Color
	input.ReportBase.IsFlooding = level.IsFlooding
	input.ReportBase.TrafficStatus = input.ReportBase.FloodLevelName

	report.ReportEnterpriseBase = input

	// If resolved, mark report resolved
	// Nếu mức độ ngập mới là không ngập (đợt ngập đã kết thúc)
	if !level.IsFlooding {
		// Đóng băng và đánh dấu báo cáo đợt ngập hiện tại thành "đã kết thúc" (resolved) để lưu trữ lịch sử
		report.Status = constant.InundationStatusResolved
		report.EndTime = time.Now().Unix()

		// Cập nhật báo cáo đợt ngập đã kết thúc vào database
		err := s.InundationReportRepo.R_Update(ctx, report)
		if err != nil {
			return nil, err
		}

		// Lấy thông tin điểm ngập tương ứng để cập nhật trạng thái hết ngập
		station, _ := s.inundationStationRepo.GetByID(ctx, report.PointID)
		if station != nil {
			// Tạo mới một báo cáo trạng thái bình thường sạch (resolved, HasFlooded = false) làm mốc hiện tại cho trạm
			newNormReportID, err := s.createNewResolvedNormalReport(ctx, station, time.Now().Unix())
			if err == nil {
				// Xóa ReportID active để báo hiệu điểm này không còn ngập nữa
				station.ReportID = ""
				// Trỏ LastReportID sang báo cáo bình thường mới tạo để UI hiển thị trạng thái sạch (độ sâu 0, màu xanh)
				station.LastReportID = newNormReportID
				// Cập nhật thông tin điểm ngập vào database
				_ = s.inundationStationRepo.Update(ctx, station)
			}
		}
		return report, nil
	}

	err := s.InundationReportRepo.R_Update(ctx, report)
	return report, err
}
