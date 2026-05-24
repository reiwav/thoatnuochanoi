package inundation

import (
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
)

// ReportEnterpriseSituation adds a new timeline update (Enterprise history) to an active report by pointID
func (s *service) ReportEnterpriseSituation(ctx context.Context, user *models.User, pointID string, update dto.AddUpdateSitutionRequest, images []ImageContent) (*models.InundationReport, error) {
	if pointID == "" {
		return nil, web.BadRequest("Point ID is required")
	}

	if update.Resolve { // Hết ngập nhanh
		return nil, s.QuickFinishV2(ctx, user, pointID)
	}

	// 1. Get or create active report
	report, err := s.getOrCreateActiveReport(ctx, pointID, update.Depth)
	if err != nil {
		return nil, err
	}

	// 2. Validate and calculate flood settings
	err = s.getSettingAndSetBase(ctx, report.ID, pointID, &update.ReportEnterpriseBase, user, images)
	if err != nil {
		return nil, err
	}
	report.ReportEnterpriseBase = update.ReportEnterpriseBase

	// 3. Create a new history log (InundationHistory)
	newHistory, err := s.createHistoryAndEnqueueSync(ctx, report.ID, user, s.getUserPermission(ctx, "inundation:enterprise_report"), report.ReportEnterpriseBase.Depth, report.ReportEnterpriseBase.Width, report.ReportEnterpriseBase.Length, report.ReportEnterpriseBase.Description, report.ReportEnterpriseBase.Images)
	if err != nil {
		return nil, err
	}

	// Update reference IDs in report
	report.EnterpriseHistoryID = newHistory.ID
	err = s.InundationReportRepo.Update(ctx, report)
	if err != nil {
		return nil, err
	}

	// Notify SSE
	go s.notifyPointChange(pointID)

	return report, nil
}

// CorrectEnterpriseReport corrects report details (NeedsCorrection mode) by pointID
func (s *service) CorrectEnterpriseReport(ctx context.Context, user *models.User, pointID string, report *models.ReportEnterpriseBase, images []ImageContent) error {
	if pointID == "" {
		return web.BadRequest("Point ID is required")
	}

	// 1. Get active report
	existing, err := s.getOrCreateActiveReport(ctx, pointID, report.Depth)
	if err != nil {
		return err
	}

	// Permission Checks
	if user.IsEmployee {
		if !existing.NeedsCorrection {
			return web.Forbidden("Chỉ được phép sửa thông tin khi có yêu cầu (nhận xét) từ người rà soát")
		}
	}
	if err := s.checkReportAccessPermission(ctx, user, existing, true); err != nil {
		return err
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

	shouldResolve := level != nil && !level.IsFlooding

	if len(images) > 0 {
		imagesSave, err := s.saveAndGetImages(images, existing.ID)
		if err != nil {
			return err
		}
		existing.Images = imagesSave
	}

	err = s.InundationReportRepo.Update(ctx, existing)
	if err != nil {
		return err
	}

	// Create a new history log (Timeline)
	newHistory, err := s.createHistoryAndEnqueueSync(ctx, existing.ID, user, s.getUserPermission(ctx, "inundation:enterprise_report"), existing.Depth, existing.Width, existing.Length, "Chỉnh sửa thông tin báo cáo (theo yêu cầu rà soát)", existing.Images)
	if err != nil {
		return err
	}

	existing.EnterpriseHistoryID = newHistory.ID
	err = s.InundationReportRepo.Update(ctx, existing)
	if err != nil {
		return err
	}

	if shouldResolve {
		_ = s.QuickFinishV2(ctx, user, pointID)
	}

	// Notify SSE
	go s.notifyPointChange(existing.PointID)

	return nil
}
