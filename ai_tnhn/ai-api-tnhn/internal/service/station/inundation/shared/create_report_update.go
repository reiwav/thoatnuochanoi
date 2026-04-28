package shared

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

func SetAndCreateInundationUpdate(ctx context.Context, report *models.InundationReport, inundationUpdateRepo repository.InundationUpdate) (*models.InundationUpdate, error) {
	initialUpdate := &models.InundationUpdate{
		ReportID:  report.ID,
		Timestamp: report.CTime,
		InundationReportBase: models.InundationReportBase{
			UserID:        report.UserID,
			UserName:      report.UserName,
			UserEmail:     report.UserEmail,
			Description:   report.Description,
			Depth:         report.Depth,
			Length:        report.Length,
			Width:         report.Width,
			TrafficStatus: report.FloodLevelName,
			Images:        report.Images,
			IsFlooding:    report.IsFlooding,
		},
	}
	if initialUpdate.Description == "" {
		if report.IsFlooding {
			initialUpdate.Description = "Bắt đầu đợt ngập"
		} else {
			initialUpdate.Description = "Kiểm tra hiện trường (Chuẩn bị/Bình thường)"
		}
	}
	err := inundationUpdateRepo.Create(ctx, initialUpdate)
	return initialUpdate, err
}
