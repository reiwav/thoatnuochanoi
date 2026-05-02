package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) validAssigned(user *models.User, pointID string) error {
	if user.IsEmployee {
		isAssigned := false
		for _, pid := range user.AssignedInundationStationIDs {
			if pid == pointID {
				isAssigned = true
				break
			}
		}
		if !isAssigned {
			return web.Forbidden("Bạn không có quyền gửi báo cáo cho địa điểm này")
		}
	}
	return nil
}

func (s *service) ListReports(ctx context.Context, orgID string) ([]*models.InundationReport, int64, error) {
	// For simplicity, list active ones or just all for now
	f := filter.NewPaginationFilter()
	if orgID != "" {
		f.AddWhere("org_id", "org_id", orgID)
	}
	f.SetOrderBy("-created_at")
	return s.InundationReportRepo.List(ctx, f)
}
func (s *service) ListReportsWithFilter(ctx context.Context, user *models.User, isAllowedAll bool, orgIDFilter string, f filter.Filter) ([]*models.InundationReport, int64, error) {
	orgID := user.OrgID
	if isAllowedAll {
		if orgIDFilter != "" {
			orgID = orgIDFilter
		}
	} else {
		orgID = user.OrgID
	}

	// Determine which points to show
	var pointIDs []string
	targetOrgID := ""
	if isAllowedAll && orgIDFilter != "" {
		targetOrgID = orgIDFilter
	} else if !isAllowedAll {
		targetOrgID = user.OrgID
	}

	if user.IsEmployee && !isAllowedAll {
		for _, pid := range user.AssignedInundationStationIDs {
			if pid != "" {
				pointIDs = append(pointIDs, pid)
			}
		}
		if len(pointIDs) == 0 {
			return []*models.InundationReport{}, 0, nil
		}
	} else if targetOrgID != "" {
		res, err := s.GetPointsStatus(ctx, user, isAllowedAll, targetOrgID)
		if err == nil {
			for _, p := range res {
				pointIDs = append(pointIDs, p.ID)
			}
		}
	}

	// Filter by allowed pointIDs or OrgID
	if len(pointIDs) > 0 {
		existingWhere := f.GetWhere()
		if requestedPointID, ok := existingWhere["point_id"].(string); ok && requestedPointID != "" {
			// User requested a specific point, check if they are allowed to see it
			isAllowed := false
			for _, pid := range pointIDs {
				if pid == requestedPointID {
					isAllowed = true
					break
				}
			}
			if !isAllowed {
				// Not allowed to see this requested point, return nothing
				f.AddWhere("point_id", "point_id", "restricted_access_placeholder")
			}
			// if allowed, the requestedPointID is already in the filter via GetWhere()
		} else {
			// No specific point requested, filter by all allowed points
			f.AddWhere("point_ids", "point_id", bson.M{"$in": pointIDs})
		}
	} else if orgID != "" {
		f.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
		})
	}

	reports, total, err := s.InundationReportRepo.List(ctx, f)
	if err != nil {
		return nil, 0, err
	}

	// Batch fetch updates
	if len(reports) > 0 {
		reportIDs := make([]string, len(reports))
		for i, r := range reports {
			reportIDs[i] = r.ID
		}

		updatesMap := make(map[string][]models.InundationUpdate)
		for _, rID := range reportIDs {
			updates, _ := s.inundationUpdateRepo.ListByReportID(ctx, rID)
			if len(updates) > 0 {
				uSlice := make([]models.InundationUpdate, len(updates))
				for i, u := range updates {
					uSlice[i] = *u
				}
				updatesMap[rID] = uSlice
			}
		}

		for _, r := range reports {
			if u, ok := updatesMap[r.ID]; ok {
				r.Updates = u
			}
		}
	}

	return reports, total, nil
}
func (s *service) GetReport(ctx context.Context, user *models.User, reportID string) (*models.InundationReport, error) {
	report, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return nil, err
	}

	// RBAC: Check visibility
	if !user.IsCompany && report.OrgID != user.OrgID {
		isAuthorized := false
		point, err := s.inundationStationRepo.GetByID(ctx, report.PointID)
		if err == nil && point != nil {
			// 1. Check if shared with user's org
			for _, sid := range point.SharedOrgIDs {
				if sid == user.OrgID {
					isAuthorized = true
					break
				}
			}
			// 2. Check if assigned specifically to this employee
			if !isAuthorized && user.IsEmployee {
				for _, pid := range user.AssignedInundationStationIDs {
					if pid == point.ID {
						isAuthorized = true
						break
					}
				}
			}
		}

		if !isAuthorized {
			return nil, web.Unauthorized("Access denied: You do not have permission to view this report")
		}
	}

	// Fetch updates from separate collection
	updates, err := s.inundationUpdateRepo.ListByReportID(ctx, reportID)
	if err == nil && len(updates) > 0 {
		report.Updates = make([]models.InundationUpdate, len(updates))
		for i, u := range updates {
			report.Updates[i] = *u
		}
	}

	return report, nil
}

func (s *service) ListReportUpdates(ctx context.Context, reportID string) ([]models.InundationUpdate, error) {
	updates, err := s.inundationUpdateRepo.ListByReportID(ctx, reportID)
	if err != nil {
		return nil, err
	}

	result := make([]models.InundationUpdate, len(updates))
	for i, u := range updates {
		result[i] = *u
	}
	return result, nil
}

func (s *service) Resolve(ctx context.Context, reportID string, endTime int64) error {
	if endTime == 0 {
		endTime = time.Now().Unix()
	}

	// NEW: Clear station's report_id when report is resolved
	report, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return err
	}
	point, _ := s.inundationStationRepo.GetByID(ctx, report.PointID)
	if point != nil {
		point.ReportID = ""
		_ = s.inundationStationRepo.Update(ctx, point)
	}

	return s.InundationReportRepo.Resolve(ctx, reportID, endTime)
}

func (s *service) QuickFinish(ctx context.Context, user *models.User, pointID string) error {
	// 1. Find the active report for this point
	inundation, err := s.GetPointByID(ctx, pointID)
	if err != nil {
		return err
	}

	// 2. Permission check
	err = s.validAssigned(user, pointID)
	if err != nil {
		return err
	}

	// 3. Create a final update record
	endTime := time.Now().Unix()
	finalUpdate := &models.InundationUpdate{
		ReportID:  inundation.ReportID,
		Timestamp: endTime,
		InundationReportBase: models.InundationReportBase{
			Description: "Kết thúc nhanh đợt ngập",
			Depth:       0,
			Width:       "0",
			ReportBase: models.ReportBase{
				UserID:        user.ID,
				UserEmail:     user.Email,
				UserName:      user.Name,
				TrafficStatus: "Bình thường",
			},
		},
	}
	_ = s.inundationUpdateRepo.Create(ctx, finalUpdate)

	// 4. Resolve the report
	return s.Resolve(ctx, inundation.ReportID, endTime)
}
