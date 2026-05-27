package shared

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

func SetAndCreateInundationHistory(ctx context.Context, report *models.InundationReport, inundationHistoryRepo repository.InundationHistory) (*models.InundationHistory, error) {
	initialHistory := &models.InundationHistory{
		InundationId:    report.PointID,
		ReportId:        report.ID,
		UserId:          report.UserID,
		UserName:        report.UserName,
		UserEmail:       report.UserEmail,
		OrgId:           report.OrgID,
		OrgName:         report.OrgName,
		RolePermission:  "inundation:enterprise_report",
		Depth:           report.ReportEnterpriseBase.Depth,
		Width:           report.ReportEnterpriseBase.Width,
		Length:          report.ReportEnterpriseBase.Length,
		TrafficStatus:   report.ReportEnterpriseBase.TrafficStatus,
		FloodLevelName:  report.ReportEnterpriseBase.FloodLevelName,
		FloodLevelColor: report.ReportEnterpriseBase.FloodLevelColor,
		Images:          report.ReportEnterpriseBase.Images,
		Note:            report.ReportEnterpriseBase.Description,
	}
	if initialHistory.Note == "" {
		if report.IsFlooding {
			initialHistory.Note = "Bắt đầu đợt ngập"
		} else {
			initialHistory.Note = "Kiểm tra hiện trường (Chuẩn bị/Bình thường)"
		}
	}
	err := inundationHistoryRepo.Create(ctx, initialHistory)
	return initialHistory, err
}
