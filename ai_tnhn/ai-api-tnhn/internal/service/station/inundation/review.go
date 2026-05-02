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
	// RBAC: Block Employee
	// if user.IsEmployee {
	// 	return web.Forbidden("Nhân viên không có quyền nhận xét bản tin")
	// }

	report, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return err
	}
	if report.Status != constant.InundationStatusActive {
		return fmt.Errorf("chỉ được phép nhận xét khi báo cáo đang ở trạng thái active")
	}

	// Permission Check
	isAllowedAll := user.Role == "super_admin" || user.IsCompany
	if !isAllowedAll {
		err := s.validatePermission(ctx, user, report)
		if err != nil {
			return err
		}
	}

	report.ReviewComment = comment
	report.ReviewerId = user.ID
	report.ReviewerEmail = user.Email
	report.ReviewerName = user.Name
	report.NeedsCorrection = true
	report.IsReviewUpdated = false
	if err := s.InundationReportRepo.Update(ctx, report); err != nil {
		return err
	}

	// Sync to latest update
	updates, err := s.inundationUpdateRepo.ListByReportID(ctx, reportID)
	if err == nil && len(updates) > 0 {
		latestUpdate := updates[len(updates)-1]
		latestUpdate.ReviewComment = comment
		latestUpdate.ReviewerId = user.ID
		latestUpdate.ReviewerEmail = user.Email
		latestUpdate.ReviewerName = user.Name
		latestUpdate.NeedsCorrection = true
		latestUpdate.IsReviewUpdated = false
		_ = s.inundationUpdateRepo.Update(ctx, latestUpdate)

		report.NeedsCorrectionUpdateID = latestUpdate.ID
		_ = s.InundationReportRepo.Update(ctx, report)
	}

	return nil
}
func (s *service) ReviewUpdate(ctx context.Context, user *models.User, updateID, comment string) error {
	// RBAC: Block Employee
	// if user.IsEmployee {
	// 	return web.Forbidden("Nhân viên không có quyền nhận xét bản tin")
	// }

	update, err := s.inundationUpdateRepo.GetByID(ctx, updateID)
	if err != nil {
		return err
	}

	report, err := s.InundationReportRepo.GetByID(ctx, update.ReportID)
	if err != nil {
		return err
	}
	if report.Status != constant.InundationStatusActive {
		return fmt.Errorf("chỉ được phép nhận xét khi báo cáo đang ở trạng thái active")
	}

	// Permission Check
	isAllowedAll := user.Role == "super_admin" || user.IsCompany
	if !isAllowedAll {
		err := s.validatePermission(ctx, user, report)
		if err != nil {
			return err
		}
	}

	update.ReviewComment = comment
	update.ReviewerId = user.ID
	update.ReviewerEmail = user.Email
	update.ReviewerName = user.Name
	update.NeedsCorrection = true
	update.IsReviewUpdated = false
	if err := s.inundationUpdateRepo.Update(ctx, update); err != nil {
		return err
	}

	report.NeedsCorrection = true
	report.NeedsCorrectionUpdateID = updateID
	report.IsReviewUpdated = false

	allUpdates, err := s.inundationUpdateRepo.ListByReportID(ctx, update.ReportID)
	if err == nil && len(allUpdates) > 0 {
		latestUpdate := allUpdates[len(allUpdates)-1]
		if latestUpdate.ID == updateID {
			report.ReviewComment = comment
			report.ReviewerId = user.ID
			report.ReviewerEmail = user.Email
			report.ReviewerName = user.Name
		}
	}

	return s.InundationReportRepo.Update(ctx, report)
}
func (s *service) GetUpdateByID(ctx context.Context, updateID string) (*models.InundationUpdate, error) {
	return s.inundationUpdateRepo.GetByID(ctx, updateID)
}
func (s *service) UpdateUpdateContent2(ctx context.Context, user *models.User, reportID string, updatedData dto.AddUpdateSitutionRequest, images []ImageContent) error {
	// 1. Get the parent report
	report, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return err
	}

	// 2. The update to edit is the one pointed by LastReportID
	updateID := report.LastReportID
	if updateID == "" {
		return web.NotFound("Không tìm thấy bản cập nhật tình hình mới nhất để chỉnh sửa")
	}

	update, err := s.inundationUpdateRepo.GetByID(ctx, updateID)
	if err != nil {
		return err
	}

	isAllowedAll := user.Role == "super_admin" || user.IsCompany
	if user.IsEmployee {
		if !report.NeedsCorrection {
			return web.Forbidden("Chỉ được phép sửa thông tin khi có yêu cầu (nhận xét) từ người rà soát")
		}
		// if report.OrgID != user.OrgID {
		// 	return web.Unauthorized("Bạn không có quyền chỉnh sửa bản tin của đơn vị khác")
		// }
	} else if !isAllowedAll {
		err := s.validatePermission(ctx, user, report)
		if err != nil {
			return err
		}
	}

	// Recalculate level for update
	level := s.calculateFloodLevel(ctx, updatedData.Depth)
	if level != nil {
		update.FloodLevelName = level.Name
		update.FloodLevelColor = level.Color
	}

	shouldResolve := level != nil && !level.IsFlooding

	// 3. Update the existing record fields
	update.Description = updatedData.Description
	update.Depth = updatedData.Depth
	update.Length = updatedData.Length
	update.Width = updatedData.Width
	update.TrafficStatus = updatedData.FloodLevelName
	update.NeedsCorrection = false
	update.IsReviewUpdated = true

	if len(images) > 0 {
		imagesSave, err := s.saveAndGetImages(images, updateID)
		if err != nil {
			return err
		}
		update.Images = imagesSave
	}

	// 4. Save the updated record
	err = s.inundationUpdateRepo.Update(ctx, update)
	if err != nil {
		return err
	}

	// 5. Sync to main report
	report.Depth = update.Depth
	report.Length = update.Length
	report.Width = update.Width
	report.TrafficStatus = update.FloodLevelName
	report.Description = update.Description
	report.Images = update.Images
	report.FloodLevelName = update.FloodLevelName
	report.FloodLevelColor = update.FloodLevelColor
	report.NeedsCorrection = false
	report.NeedsCorrectionUpdateID = ""
	report.IsReviewUpdated = true

	_ = s.InundationReportRepo.Update(ctx, report)

	if shouldResolve {
		_ = s.Resolve(ctx, report.ID, 0)
	}

	return nil
}

func (s *service) validatePermission(ctx context.Context, user *models.User, report *models.InundationReport) error {
	isAuthorized := report.OrgID == user.OrgID
	if !isAuthorized && user.OrgID != "" {
		point, err := s.inundationStationRepo.GetByID(ctx, report.PointID)
		if err == nil && point != nil {
			for _, sid := range point.SharedOrgIDs {
				if sid == user.OrgID {
					isAuthorized = true
					break
				}
			}
		}
	}
	if !isAuthorized {
		return web.Unauthorized("Bạn không có quyền chỉnh sửa bản tin này")
	}
	return nil
}
