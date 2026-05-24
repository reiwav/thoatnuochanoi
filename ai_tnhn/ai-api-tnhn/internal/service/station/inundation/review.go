package inundation

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"fmt"
)

func (s *service) ReviewReport(ctx context.Context, user *models.User, reportID, comment string) error {
	report, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return err
	}
	if report.Status != constant.InundationStatusActive {
		return fmt.Errorf("chỉ được phép nhận xét khi báo cáo đang ở trạng thái active")
	}

	// Permission Check
	if err := s.checkReportAccessPermission(ctx, user, report, false); err != nil {
		return err
	}

	// Create review history log
	newHistory := &models.InundationHistory{
		InundationId:    report.PointID,
		ReportId:        reportID,
		UserId:          user.ID,
		UserName:        user.Name,
		UserEmail:       user.Email,
		OrgId:           user.OrgID,
		OrgName:         s.getOrgName(ctx, user.OrgID),
		RolePermission:  "inundation:review",
		Note:            comment,
		ReviewComment:   comment,
		NeedsCorrection: true,
	}
	err = s.inundationHistoryRepo.Create(ctx, newHistory)
	if err != nil {
		return err
	}

	report.ReviewComment = comment
	report.ReviewerId = user.ID
	report.ReviewerEmail = user.Email
	report.ReviewerName = user.Name
	report.NeedsCorrection = true
	report.IsReviewUpdated = false
	report.ReviewHistoryID = newHistory.ID
	report.NeedsCorrectionUpdateID = newHistory.ID

	if err := s.InundationReportRepo.Update(ctx, report); err != nil {
		return err
	}

	// Notify SSE subscribers about the change
	go s.notifyPointChange(report.PointID)

	return nil
}

func (s *service) ReviewUpdate(ctx context.Context, user *models.User, updateID, comment string) error {
	history, err := s.inundationHistoryRepo.GetByID(ctx, updateID)
	if err != nil {
		return err
	}

	reportID := history.ReportId
	if reportID == "" {
		reportID = history.InundationId
	}
	report, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return err
	}
	if report.Status != constant.InundationStatusActive {
		return fmt.Errorf("chỉ được phép nhận xét khi báo cáo đang ở trạng thái active")
	}

	// Permission Check
	if err := s.checkReportAccessPermission(ctx, user, report, false); err != nil {
		return err
	}

	history.ReviewComment = comment
	history.NeedsCorrection = true
	if err := s.inundationHistoryRepo.Update(ctx, history); err != nil {
		return err
	}

	report.NeedsCorrection = true
	report.NeedsCorrectionUpdateID = updateID
	report.IsReviewUpdated = false
	report.ReviewComment = comment
	report.ReviewerId = user.ID
	report.ReviewerEmail = user.Email
	report.ReviewerName = user.Name

	// Luôn tạo review history mới (history luôn tạo mới)
	newReviewHistory := &models.InundationHistory{
		InundationId:    report.PointID,
		ReportId:        report.ID,
		UserId:          user.ID,
		UserName:        user.Name,
		UserEmail:       user.Email,
		OrgId:           user.OrgID,
		OrgName:         s.getOrgName(ctx, user.OrgID),
		RolePermission:  "inundation:review",
		Note:            comment,
		ReviewComment:   comment,
		NeedsCorrection: true,
	}
	_ = s.inundationHistoryRepo.Create(ctx, newReviewHistory)
	report.ReviewHistoryID = newReviewHistory.ID

	err = s.InundationReportRepo.Update(ctx, report)
	if err != nil {
		return err
	}

	// Notify SSE subscribers about the change
	go s.notifyPointChange(report.PointID)

	return nil
}

func (s *service) GetHistoryByID(ctx context.Context, historyID string) (*models.InundationHistory, error) {
	return s.inundationHistoryRepo.GetByID(ctx, historyID)
}

func (s *service) CorrectEnterpriseSituation(ctx context.Context, user *models.User, pointID string, updatedData dto.AddUpdateSitutionRequest, images []ImageContent) error {
	// 1. Get the parent report
	report, err := s.getOrCreateActiveReport(ctx, pointID, updatedData.Depth)
	if err != nil {
		return err
	}

	if user.IsEmployee {
		if !report.NeedsCorrection {
			return web.Forbidden("Chỉ được phép sửa thông tin khi có yêu cầu (nhận xét) từ người rà soát")
		}
	}
	if err := s.checkReportAccessPermission(ctx, user, report, true); err != nil {
		return err
	}

	// Recalculate level
	level := s.calculateFloodLevel(ctx, updatedData.Depth)
	shouldResolve := level != nil && !level.IsFlooding

	// 2. Tạo history MỚI với dữ liệu đã chỉnh sửa (history luôn tạo mới)
	var imagesSave []string
	if len(images) > 0 {
		imagesSave, err = s.saveAndGetImages(images, report.ID)
		if err != nil {
			return err
		}
	}

	newHistory, err := s.createHistoryAndEnqueueSync(ctx, report.ID, user, s.getUserPermission(ctx, "inundation:enterprise_report"), updatedData.Depth, updatedData.Width, updatedData.Length, updatedData.Description, imagesSave)
	if err != nil {
		return err
	}

	// 3. Sync to main report
	report.NeedsCorrection = false
	report.NeedsCorrectionUpdateID = ""
	report.IsReviewUpdated = true
	report.EnterpriseHistoryID = newHistory.ID

	_ = s.InundationReportRepo.Update(ctx, report)

	if shouldResolve {
		_ = s.QuickFinishV2(ctx, user, pointID)
	}

	// Notify SSE subscribers about the change
	go s.notifyPointChange(report.PointID)

	return nil
}
