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
	if !level.IsFlooding {
		report.Status = constant.InundationStatusResolved
		report.EndTime = time.Now().Unix()

		err := s.InundationReportRepo.R_Update(ctx, report)
		if err != nil {
			return nil, err
		}

		// Also clear station's active report reference and create a new resolved normal report
		station, _ := s.inundationStationRepo.GetByID(ctx, report.PointID)
		if station != nil {
			newNormReportID, err := s.createNewResolvedNormalReport(ctx, station, time.Now().Unix())
			if err == nil {
				station.ReportID = ""
				station.LastReportID = newNormReportID
				_ = s.inundationStationRepo.Update(ctx, station)
			}
		}
		return report, nil
	}

	err := s.InundationReportRepo.R_Update(ctx, report)
	return report, err
}
