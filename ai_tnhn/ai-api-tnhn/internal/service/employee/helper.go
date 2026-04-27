package employee

import (
	"ai-api-tnhn/utils/web"
	"context"
)

func (s *service) validateAssignments(ctx context.Context, userID string, orgID string, pointIDs, rainIDs, lakeIDs, riverIDs, constructionIDs []string, stationID string, wastewaterID string) error {
	// Restrictions removed to allow multiple and overlapping assignments as requested.
	return nil
}

func (s *service) checkRoleLevel(ctx context.Context, currentUserRole, targetRole string) error {
	if currentUserRole == "super_admin" {
		return nil
	}

	currentInfo, err := s.roleRepo.GetByCode(ctx, currentUserRole)
	if err != nil || currentInfo == nil {
		return web.Forbidden("Không xác định được vai trò của bạn")
	}

	targetInfo, err := s.roleRepo.GetByCode(ctx, targetRole)
	if err != nil || targetInfo == nil {
		return web.BadRequest("Vai trò định gán không hợp lệ")
	}

	if targetInfo.Level < currentInfo.Level {
		return web.Forbidden("Bạn không có quyền thực hiện thao tác này cho vai trò có cấp độ cao hơn (Level nhỏ hơn)")
	}

	if currentInfo.Group != "" && targetInfo.Group != currentInfo.Group {
		return web.Forbidden("Bạn chỉ có quyền thực hiện thao tác cho vai trò thuộc nhóm: " + currentInfo.Group)
	}

	return nil
}
