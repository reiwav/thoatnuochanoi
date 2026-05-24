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
