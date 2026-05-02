package inundation

import (
	"ai-api-tnhn/internal/models"
	"context"
	"time"
)

func (s *service) UpdateMech(ctx context.Context, user *models.User, id string, input *models.ReportMechBase, images []ImageContent) error {
	existing, err := s.InundationReportRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Permission Checks
	if err = s.checkEdit(ctx, user, existing); err != nil {
		return err
	}

	existing.MechChecked = input.MechChecked
	existing.MechNote = input.MechNote
	existing.MechD = input.MechD
	existing.MechR = input.MechR
	existing.MechS = input.MechS
	existing.MechUserID = user.ID
	existing.MechUserName = user.Name
	existing.MechUpdatedAt = time.Now().Unix()

	// OVERRIDE: Update main report dimensions with worker's data
	// If MechD is provided (can be 0), we use it to calculate the level
	existing.Depth = input.MechD
	level := s.calculateFloodLevel(ctx, existing.Depth)
	if level != nil {
		existing.FloodLevelName = level.Name
		existing.FloodLevelColor = level.Color
		existing.IsFlooding = level.IsFlooding
	}

	shouldResolve := level != nil && !level.IsFlooding
	if input.MechS != "" {
		existing.Length = input.MechS
	}
	if input.MechR != "" {
		existing.Width = input.MechR
	}

	if len(images) > 0 {
		imagesSave, err := s.saveAndGetImages(images, id)
		if err != nil {
			return err
		}
		existing.MechImages = imagesSave
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
			Description: "Cập nhật dữ liệu từ XN Cơ giới",
			Depth:       existing.Depth,
			Length:      existing.Length,
			Width:       existing.Width,
			PointID:     existing.PointID,
			ReportBase: models.ReportBase{
				UserID:          user.ID,
				UserEmail:       user.Email,
				UserName:        user.Name,
				FloodLevelName:  existing.FloodLevelName,
				FloodLevelColor: existing.FloodLevelColor,
				TrafficStatus:   existing.TrafficStatus,
				IsFlooding:      existing.IsFlooding,
			},
		},
		ReportMechBase: models.ReportMechBase{
			MechChecked:   existing.MechChecked,
			MechNote:      existing.MechNote,
			MechD:         existing.MechD,
			MechR:         existing.MechR,
			MechS:         existing.MechS,
			MechUserID:    existing.MechUserID,
			MechUserName:  existing.MechUserName,
			MechUpdatedAt: existing.MechUpdatedAt,
			MechImages:    existing.MechImages,
		},
	}
	_ = s.inundationUpdateRepo.Create(ctx, newUpdate)

	if shouldResolve {
		_ = s.Resolve(ctx, id, 0)
	}

	// Notify SSE subscribers about the change
	go s.notifyPointChange(existing.PointID)

	return nil
}
