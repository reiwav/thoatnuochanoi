package inundation

import (
	"ai-api-tnhn/internal/models"
	"context"
	"time"
)

// ReportMech updates mechanization (Cơ giới) data for an active report by pointID
func (s *service) ReportMech(ctx context.Context, user *models.User, pointID string, input *models.ReportMechBase, images []ImageContent) error {
	// 1. Get or create active report
	existing, err := s.getOrCreateActiveReport(ctx, pointID, input.MechD)
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

	newHistory, err := s.createHistoryAndEnqueueSync(ctx, existing.ID, user, "inundation:mechanic", input.MechD, input.MechR, input.MechS, input.MechNote, imagesSave)
	if err != nil {
		return err
	}

	existing.ReportMechBase = *input
	existing.ReportMechBase.MechImages = imagesSave
	existing.ReportMechBase.MechUserID = user.ID
	existing.ReportMechBase.MechUserName = user.Name
	existing.ReportMechBase.MechUpdatedAt = time.Now().Unix()

	existing.MechHistoryID = newHistory.ID

	level := s.calculateFloodLevel(ctx, input.MechD)
	shouldResolve := (level != nil && !level.IsFlooding) || (level == nil && input.MechD == 0)

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
