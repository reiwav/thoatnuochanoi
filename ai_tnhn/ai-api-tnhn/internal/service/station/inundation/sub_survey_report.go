package inundation

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"time"
)

func (s *service) UpdateSurvey(ctx context.Context, user *models.User, id string, input *models.ReportSurveyBase, images []ImageContent) error {
	existing, err := s.InundationReportRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if err = s.checkEdit(ctx, user, existing); err != nil {
		return err
	}
	existing.SurveyChecked = input.SurveyChecked
	existing.SurveyNote = input.SurveyNote
	existing.SurveyUserID = user.ID
	existing.SurveyUserName = user.Name
	existing.SurveyUpdatedAt = time.Now().Unix()

	if len(images) > 0 {
		imagesSave, err := s.saveAndGetImages(images, id)
		if err != nil {
			return err
		}
		existing.SurveyImages = imagesSave
	}

	err = s.InundationReportRepo.Update(ctx, existing)
	if err != nil {
		return err
	}

	// Create update record for history
	newUpdate := &models.InundationUpdate{
		ReportID:  id,
		Timestamp: time.Now().Unix(),
		InundationReportBase: models.InundationReportBase{
			PointID: existing.PointID,
			ReportBase: models.ReportBase{
				UserID:    user.ID,
				UserEmail: user.Email,
				UserName:  user.Name,
			},
			Description: "Cập nhật thông tin XN KSTK",
		},
		ReportSurveyBase: models.ReportSurveyBase{
			SurveyChecked:   existing.SurveyChecked,
			SurveyNote:      existing.SurveyNote,
			SurveyImages:    existing.SurveyImages,
			SurveyUserID:    existing.SurveyUserID,
			SurveyUserName:  existing.SurveyUserName,
			SurveyUpdatedAt: existing.SurveyUpdatedAt,
		},
	}
	_ = s.inundationUpdateRepo.Create(ctx, newUpdate)

	// Notify SSE subscribers about the change
	go s.notifyPointChange(existing.PointID)

	return nil
}

func (s *service) checkEdit(ctx context.Context, user *models.User, existing *models.InundationReport) error {
	// Permission Checks
	isAllowedAll := user.Role == "super_admin" || user.IsCompany
	if !isAllowedAll {
		isAuthorized := existing.OrgID == user.OrgID
		if !isAuthorized && user.OrgID != "" {
			point, err := s.inundationStationRepo.GetByID(ctx, existing.PointID)
			if err == nil && point != nil {
				for _, sid := range point.SharedOrgIDs {
					if sid == user.OrgID {
						isAuthorized = true
						break
					}
				}
				if !isAuthorized && user.IsEmployee {
					for _, pid := range user.AssignedInundationStationIDs {
						if pid == existing.PointID {
							isAuthorized = true
							break
						}
					}
				}
			}
		}
		if !isAuthorized {
			return web.Unauthorized("Bạn không có quyền cập nhật!")
		}
	}
	return nil
}
