package inundation

import (
	"ai-api-tnhn/internal/models"
	"context"
	"time"
)

// ReportKTCL updates quality control (Kỹ thuật Chất lượng) data for an active report by pointID
func (s *service) ReportKTCL(ctx context.Context, user *models.User, pointID string, input *models.ReportKTCLBase, images []ImageContent) error {
	// 1. Get or create active report
	existing, err := s.getOrCreateActiveReport(ctx, pointID, input.KtclD)
	if err != nil {
		return err
	}

	// Permission Checks
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

	newHistory, err := s.createHistoryAndEnqueueSync(ctx, existing.ID, user, "inundation:report", input.KtclD, input.KtclR, input.KtclS, input.KtclNote, imagesSave)
	if err != nil {
		return err
	}

	existing.ReportKTCLBase = *input
	existing.ReportKTCLBase.KtclImages = imagesSave
	existing.ReportKTCLBase.KtclUserID = user.ID
	existing.ReportKTCLBase.KtclUserName = user.Name
	existing.ReportKTCLBase.KtclUpdatedAt = time.Now().Unix()

	existing.KtclHistoryID = newHistory.ID

	level := s.calculateFloodLevel(ctx, input.KtclD)
	shouldResolve := (level != nil && !level.IsFlooding) || (level == nil && input.KtclD == 0)

	err = s.InundationReportRepo.Update(ctx, existing)
	if err != nil {
		return err
	}

	if shouldResolve {
		_ = s.subFinish(ctx, pointID, existing, time.Now().Unix())
	}

	// Notify SSE subscribers about the change
	go s.notifyPointChange(existing.PointID)

	return nil
}
