package inundation

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"fmt"
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
	fmt.Println("======= existing: ", existing)
	if err != nil {
		return err
	}

	station.ReportID = ""
	err = s.inundationStationRepo.Update(ctx, station)
	fmt.Println("update station: ", err)
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
	err = s.InundationReportRepo.Update(ctx, existing)
	if err != nil {
		return err
	}
	crteUpdate := models.InundationUpdate{
		ReportID:  reportID,
		Timestamp: now,
		InundationReportBase: models.InundationReportBase{
			Description: "Kết thúc nhanh đợt ngập",
			Depth:       0,
			PointID:     existing.PointID,
			ReportBase: models.ReportBase{
				FloodLevelName:  "Bình thường",
				FloodLevelColor: "#10b981",
				TrafficStatus:   "Bình thường",
				IsFlooding:      false,
				UserID:          user.ID,
				UserEmail:       user.Email,
				UserName:        user.Name,
			},
		},
	}
	err = s.inundationUpdateRepo.Create(ctx, &crteUpdate)
	if err != nil {
		return err
	}

	// Notify SSE subscribers about the change
	go s.notifyPointChange(pointID)

	return nil
}
