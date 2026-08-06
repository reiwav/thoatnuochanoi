package inundation

import (
	"ai-api-tnhn/internal/models"
	"context"
	"time"
)

func (s *service) ReportSurvey(ctx context.Context, user *models.User, pointID string, input *models.ReportSurveyBase, images []ImageContent) error {
	st, existing, err := s.getOrCreateActiveReport(ctx, pointID, input.SurveyD)
	if err != nil {
		return err
	}
	if err = s.checkReportAccessPermission(ctx, user, existing, true); err != nil {
		return err
	}
	var imagesSave []string
	if len(images) > 0 {
		var err error
		imagesSave, err = s.saveAndGetImages(images, existing.ID)
		if err != nil {
			return err
		}
	}

	newHistory, err := s.createHistoryAndEnqueueSync(ctx, existing.ID, user, "inundation:survey", input.SurveyD, input.SurveyR, input.SurveyS, input.SurveyNote, imagesSave)
	if err != nil {
		return err
	}

	existing.ReportSurveyBase = *input
	existing.ReportSurveyBase.SurveyImages = imagesSave
	existing.ReportSurveyBase.SurveyUserID = user.ID
	existing.ReportSurveyBase.SurveyUserName = user.Name
	importTime := time.Now().Unix()
	existing.ReportSurveyBase.SurveyUpdatedAt = importTime

	existing.SurveyHistoryID = newHistory.ID

	level := s.calculateFloodLevel(ctx, input.SurveyD)
	shouldResolve := (level != nil && !level.IsFlooding) || (level == nil && input.SurveyD == 0)

	err = s.InundationReportRepo.Update(ctx, existing)
	if err != nil {
		return err
	}

	if existing.IsFlooding {
		s.touchStationLastFloodedTime(ctx, st)
	}

	if shouldResolve {
		_ = s.subFinish(ctx, pointID, existing, time.Now().Unix())
	}

	// Notify SSE subscribers about the change
	go s.notifyPointChange(existing.PointID)

	return nil
}
