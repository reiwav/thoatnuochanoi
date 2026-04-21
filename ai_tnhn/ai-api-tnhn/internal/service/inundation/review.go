package inundation

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"fmt"
	"time"
)

func (s *service) ReviewReport(ctx context.Context, user *models.User, reportID, comment string) error {
	// RBAC: Block Employee
	if user.IsEmployee {
		return web.Forbidden("Nhân viên không có quyền nhận xét bản tin")
	}

	report, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return err
	}
	if report.Status != "active" {
		return fmt.Errorf("chỉ được phép nhận xét khi báo cáo đang ở trạng thái active")
	}

	// Permission Check
	isAllowedAll := user.Role == "super_admin" || user.IsCompany
	if !isAllowedAll {
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
			return web.Unauthorized("Bạn không có quyền nhận xét bản tin này")
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
	if user.IsEmployee {
		return web.Forbidden("Nhân viên không có quyền nhận xét bản tin")
	}

	update, err := s.inundationUpdateRepo.GetByID(ctx, updateID)
	if err != nil {
		return err
	}

	report, err := s.InundationReportRepo.GetByID(ctx, update.ReportID)
	if err != nil {
		return err
	}
	if report.Status != "active" {
		return fmt.Errorf("chỉ được phép nhận xét khi báo cáo đang ở trạng thái active")
	}

	// Permission Check
	isAllowedAll := user.Role == "super_admin" || user.IsCompany
	if !isAllowedAll {
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
			return web.Unauthorized("Bạn không có quyền nhận xét bản tin này")
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
func (s *service) UpdateUpdateContent(ctx context.Context, user *models.User, updateID string, updatedData *models.InundationUpdate, images []ImageContent) error {
	update, err := s.inundationUpdateRepo.GetByID(ctx, updateID)
	if err != nil {
		return err
	}

	// Permission Checks
	report, err := s.InundationReportRepo.GetByID(ctx, update.ReportID)
	if err != nil {
		return err
	}

	isAllowedAll := user.Role == "super_admin" || user.IsCompany
	if user.IsEmployee {
		if !update.NeedsCorrection {
			return web.Forbidden("Chỉ được phép sửa thông tin khi có yêu cầu (nhận xét) từ người rà soát")
		}
		if report.OrgID != user.OrgID {
			return web.Unauthorized("Bạn không có quyền chỉnh sửa bản tin của đơn vị khác")
		}
	} else if !isAllowedAll {
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
	}

	// 1. Update the existing record
	update.Description = updatedData.Description
	update.Depth = updatedData.Depth
	update.Length = updatedData.Length
	update.Width = updatedData.Width
	update.TrafficStatus = updatedData.TrafficStatus
	update.NeedsCorrection = false
	update.IsReviewUpdated = true

	if len(images) > 0 {
		savedPaths, err := s.saveLocalImages(fmt.Sprintf("%s_fix_%d", updateID, time.Now().Unix()), images)
		if err == nil {
			newImages := []string{}
			for _, path := range savedPaths {
				newImages = append(newImages, "local:"+path)
			}
			update.Images = newImages
		}
	}

	// 2. Save the updated record
	err = s.inundationUpdateRepo.Update(ctx, update)
	if err != nil {
		return err
	}

	// 3. Sync to main report
	allUpdates, err := s.inundationUpdateRepo.ListByReportID(ctx, update.ReportID)
	if err == nil && len(allUpdates) > 0 {
		latest := allUpdates[len(allUpdates)-1]
		if latest.ID == update.ID {
			mainReport, rErr := s.InundationReportRepo.GetByID(ctx, update.ReportID)
			if rErr == nil {
				mainReport.Depth = update.Depth
				mainReport.Length = update.Length
				mainReport.Width = update.Width
				mainReport.TrafficStatus = update.TrafficStatus
				mainReport.Description = update.Description
				mainReport.Images = update.Images
				mainReport.NeedsCorrection = false
				mainReport.NeedsCorrectionUpdateID = ""
				mainReport.IsReviewUpdated = true
				_ = s.InundationReportRepo.Update(ctx, mainReport)
			}
		} else {
			mainReport, rErr := s.InundationReportRepo.GetByID(ctx, update.ReportID)
			if rErr == nil && mainReport.NeedsCorrectionUpdateID == update.ID {
				mainReport.NeedsCorrection = false
				mainReport.NeedsCorrectionUpdateID = ""
				_ = s.InundationReportRepo.Update(ctx, mainReport)
			}
		}
	}

	return nil
}
