package inundation

import (
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"time"
)

// Cập nhật/thêm mới trong timeline ngập
func (s *service) UpdateUpdateSitution(ctx context.Context, user *models.User, reportID string, update dto.AddUpdateSitutionRequest, images []ImageContent) (*models.InundationReport, error) {
	report, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return nil, err
	}
	if update.Resolve { // hết ngập
		return nil, s.QuickFinishV2(ctx, user, report.PointID)
	}
	update.PointID = report.PointID
	err = s.getSettingAndSetBase(ctx, reportID, &update.InundationReportBase, user, images)
	if err != nil {
		return nil, err
	}
	report.InundationReportBase = update.InundationReportBase
	err = s.InundationReportRepo.Update(ctx, report)
	//tạo bản ghi phụ
	go s.inundationUpdateRepo.Create(ctx, &models.InundationUpdate{
		InundationReportBase: report.InundationReportBase,
	})

	// Notify SSE subscribers about the change
	go s.notifyPointChange(report.PointID)

	return report, err
}

// Chỉnh sửa theo yêu cầu người rà soát
func (s *service) UpdateReport(ctx context.Context, user *models.User, id string, report *models.InundationReportBase, images []ImageContent) error {
	existing, err := s.InundationReportRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Permission Checks
	isAllowedAll := user.IsCompany
	if user.IsEmployee {
		// Employees can ONLY edit if NeedsCorrection is true AND it belongs to their org
		if !existing.NeedsCorrection {
			return web.Forbidden("Chỉ được phép sửa thông tin khi có yêu cầu (nhận xét) từ người rà soát")
		}
		if existing.OrgID != user.OrgID {
			return web.Unauthorized("Bạn không có quyền chỉnh sửa báo cáo của đơn vị khác")
		}
	} else if !isAllowedAll {
		// Non-employee manager check (Ownership or Shared)
		err := s.validatePermission(ctx, user, existing)
		if err != nil {
			return err
		}
	}

	existing.Depth = report.Depth
	existing.Length = report.Length
	existing.Width = report.Width
	existing.Description = report.Description

	level := s.calculateFloodLevel(ctx, existing.Depth)
	if level != nil {
		existing.FloodLevelName = level.Name
		existing.FloodLevelColor = level.Color
		existing.IsFlooding = level.IsFlooding
	}
	existing.TrafficStatus = existing.FloodLevelName

	existing.NeedsCorrection = false
	existing.NeedsCorrectionUpdateID = ""

	// If updated to a non-flooding level, we should clear point status and resolve later
	shouldResolve := level != nil && !level.IsFlooding

	if len(images) > 0 {
		imagesSave, err := s.saveAndGetImages(images, id)
		if err != nil {
			return err
		}
		existing.Images = imagesSave
	}

	err = s.InundationReportRepo.Update(ctx, existing)
	if err != nil {
		return err
	}

	// Create a new update for history (Timeline)
	newUpdate := &models.InundationUpdate{
		ReportID:  id,
		Timestamp: time.Now().Unix(),
		InundationReportBase: models.InundationReportBase{
			Description: "Chỉnh sửa thông tin báo cáo (theo yêu cầu rà soát)",
			Depth:       existing.Depth,
			Length:      existing.Length,
			Width:       existing.Width,
			ReportBase: models.ReportBase{
				FloodLevelName:  existing.FloodLevelName,
				FloodLevelColor: existing.FloodLevelColor,
				UserID:          user.ID,
				UserEmail:       user.Email,
				UserName:        user.Name,
				TrafficStatus:   existing.TrafficStatus,
				Images:          existing.Images,
				IsFlooding:      existing.IsFlooding,
			},
		},
		ReportReviewBase: models.ReportReviewBase{
			IsReviewUpdated: true,
		},
	}
	_ = s.inundationUpdateRepo.Create(ctx, newUpdate)

	if shouldResolve {
		_ = s.QuickFinishV2(ctx, user, id)
	}

	// Notify SSE subscribers about the change
	go s.notifyPointChange(existing.PointID)

	return nil
}
