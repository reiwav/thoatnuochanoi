package inundation

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
)

func (s *service) getSettingAndSetBase(ctx context.Context, reportID string, update *models.InundationReportBase, user *models.User, images []ImageContent) error {
	level := s.calculateFloodLevel(ctx, update.Depth)
	if level == nil {
		return web.BadRequest("Flood level not found")
	}
	update.FloodLevelName = level.Name
	update.FloodLevelColor = level.Color
	update.IsFlooding = level.IsFlooding
	update.TrafficStatus = level.Name
	update.UserEmail = user.Email
	update.UserID = user.ID
	update.UserName = user.Name

	// 3. Save images locally
	imgs, err := s.saveAndGetImages(images, reportID)
	if err != nil {
		return err
	}
	update.Images = imgs
	return nil
}
