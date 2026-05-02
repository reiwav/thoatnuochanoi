package shared

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
)

func SetSurveyAndUpdateReport(ctx context.Context, user *models.User, repo repository.InundationReport,
	input models.InundationReportBase, station *models.InundationStation) (*models.InundationReport, error) {
	input.UserID = user.ID
	input.UserEmail = user.Email
	input.UserName = user.Name
	mod := &models.InundationReport{
		InundationReportBase: input,
		OrgID:                station.OrgID,
		SharedOrgIDs:         station.SharedOrgIDs,
	}
	err := repo.R_Create(ctx, mod)
	return mod, err
}
