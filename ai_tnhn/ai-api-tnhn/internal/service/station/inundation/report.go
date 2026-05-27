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

	// Fill reports bases and load flat history log
	if len(reports) > 0 {
		err = s.fillReportBases(ctx, reports...)
		if err != nil {
			return nil, 0, err
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

	// Fill report bases and updates
	err = s.fillReportBases(ctx, report)
	if err != nil {
		return nil, err
	}

	return report, nil
}

func (s *service) ListReportHistory(ctx context.Context, reportID string) ([]models.InundationHistory, error) {
	updates, err := s.inundationHistoryRepo.ListByReportID(ctx, reportID)
	if err != nil {
		return nil, err
	}

	result := make([]models.InundationHistory, len(updates))
	for i, u := range updates {
		result[i] = *u
	}
	return result, nil
}

func (s *service) Resolve(ctx context.Context, reportID string, endTime int64) error {
	if endTime == 0 {
		endTime = time.Now().Unix()
	}

	report, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return err
	}
	point, _ := s.inundationStationRepo.GetByID(ctx, report.PointID)
	if point != nil {
		newNormReportID, err := s.createNewResolvedNormalReport(ctx, point, endTime)
		if err == nil {
			point.ReportID = ""
			point.LastReportID = newNormReportID
			_ = s.inundationStationRepo.Update(ctx, point)
		}
	}

	err = s.InundationReportRepo.Resolve(ctx, reportID, endTime)
	if err == nil {
		go s.notifyPointChange(report.PointID)
	}
	return err
}

func (s *service) fillReportBases(ctx context.Context, reports ...*models.InundationReport) error {
	if len(reports) == 0 {
		return nil
	}

	// 1. Gather all history IDs
	var historyIDs []string
	for _, r := range reports {
		if r.EnterpriseHistoryID != "" {
			historyIDs = append(historyIDs, r.EnterpriseHistoryID)
		}
		if r.MechHistoryID != "" {
			historyIDs = append(historyIDs, r.MechHistoryID)
		}
		if r.SurveyHistoryID != "" {
			historyIDs = append(historyIDs, r.SurveyHistoryID)
		}
		if r.ReviewHistoryID != "" {
			historyIDs = append(historyIDs, r.ReviewHistoryID)
		}
		if r.KtclHistoryID != "" {
			historyIDs = append(historyIDs, r.KtclHistoryID)
		}
	}

	// 2. Fetch all histories in a single query
	var histories []*models.InundationHistory
	var err error
	if len(historyIDs) > 0 {
		histories, err = s.inundationHistoryRepo.GetByIDs(ctx, historyIDs)
		if err != nil {
			return err
		}
	}

	// 3. Map histories by ID
	historyMap := make(map[string]*models.InundationHistory)
	for _, h := range histories {
		historyMap[h.ID] = h
	}

	// 4. Fill base structures for each report
	for _, r := range reports {
		// Fill Enterprise Data
		if r.EnterpriseHistoryID != "" {
			if h, ok := historyMap[r.EnterpriseHistoryID]; ok {
				r.ReportEnterpriseBase.Depth = h.Depth
				r.ReportEnterpriseBase.Width = h.Width
				r.ReportEnterpriseBase.Length = h.Length
				r.ReportEnterpriseBase.Description = h.Note
				r.ReportEnterpriseBase.TrafficStatus = h.TrafficStatus
				r.ReportEnterpriseBase.FloodLevelName = h.FloodLevelName
				r.ReportEnterpriseBase.FloodLevelColor = h.FloodLevelColor
				r.ReportEnterpriseBase.UserID = h.UserId
				r.ReportEnterpriseBase.UserName = h.UserName
				r.ReportEnterpriseBase.UserEmail = h.UserEmail
				r.ReportEnterpriseBase.Images = h.Images
				r.ReportEnterpriseBase.IsFlooding = h.Depth > 0
				r.ReportEnterpriseBase.EntUpdatedAt = h.CTime
			}
		}

		// Fill Mech Data
		if r.MechHistoryID != "" {
			if h, ok := historyMap[r.MechHistoryID]; ok {
				r.ReportMechBase.MechD = h.Depth
				r.ReportMechBase.MechR = h.Width
				r.ReportMechBase.MechS = h.Length
				r.ReportMechBase.MechChecked = true
				r.ReportMechBase.MechNote = h.Note
				r.ReportMechBase.MechUserID = h.UserId
				r.ReportMechBase.MechUserName = h.UserName
				r.ReportMechBase.MechUpdatedAt = h.CTime
				r.ReportMechBase.MechImages = h.Images
			}
		}

		// Fill Survey Data
		if r.SurveyHistoryID != "" {
			if h, ok := historyMap[r.SurveyHistoryID]; ok {
				r.ReportSurveyBase.SurveyChecked = true
				r.ReportSurveyBase.SurveyNote = h.Note
				r.ReportSurveyBase.SurveyUserID = h.UserId
				r.ReportSurveyBase.SurveyUserName = h.UserName
				r.ReportSurveyBase.SurveyUpdatedAt = h.CTime
				r.ReportSurveyBase.SurveyImages = h.Images
				r.ReportSurveyBase.SurveyD = h.Depth
				r.ReportSurveyBase.SurveyR = h.Width
				r.ReportSurveyBase.SurveyS = h.Length
			}
		}

		// Fill Review Data
		if r.ReviewHistoryID != "" {
			if h, ok := historyMap[r.ReviewHistoryID]; ok {
				r.ReportReviewBase.ReviewComment = h.ReviewComment
				r.ReportReviewBase.ReviewerId = h.UserId
				r.ReportReviewBase.ReviewerName = h.UserName
				r.ReportReviewBase.ReviewerEmail = h.UserEmail
				r.ReportReviewBase.ReviewUpdatedAt = h.CTime

				if h.NeedsCorrection {
					r.ReportReviewBase.NeedsCorrection = true
					r.ReportReviewBase.IsReviewUpdated = false

					// Check if the enterprise has updated the report since the review was submitted
					if r.EnterpriseHistoryID != "" {
						if entH, ok := historyMap[r.EnterpriseHistoryID]; ok {
							if entH.CTime > h.CTime {
								r.ReportReviewBase.NeedsCorrection = false
								r.ReportReviewBase.IsReviewUpdated = true
							}
						}
					}
				} else {
					r.ReportReviewBase.NeedsCorrection = false
					r.ReportReviewBase.IsReviewUpdated = true
				}
			}
		}

		// Fill KTCL Data
		if r.KtclHistoryID != "" {
			if h, ok := historyMap[r.KtclHistoryID]; ok {
				r.ReportKTCLBase.KtclChecked = true
				r.ReportKTCLBase.KtclNote = h.Note
				r.ReportKTCLBase.KtclUserID = h.UserId
				r.ReportKTCLBase.KtclUserName = h.UserName
				r.ReportKTCLBase.KtclUpdatedAt = h.CTime
				r.ReportKTCLBase.KtclImages = h.Images
				r.ReportKTCLBase.KtclD = h.Depth
				r.ReportKTCLBase.KtclR = h.Width
				r.ReportKTCLBase.KtclS = h.Length
			}
		}

		// If the Enterprise (DBXN) team has not reported yet, take the last group's data and assign it to the root fields (DxRxS)
		if r.EnterpriseHistoryID == "" {
			var latestHistory *models.InundationHistory
			var latestTime int64

			// Check Mech
			if r.MechHistoryID != "" {
				if h, ok := historyMap[r.MechHistoryID]; ok {
					if h.CTime > latestTime {
						latestTime = h.CTime
						latestHistory = h
					}
				}
			}
			// Check Survey
			if r.SurveyHistoryID != "" {
				if h, ok := historyMap[r.SurveyHistoryID]; ok {
					if h.CTime > latestTime {
						latestTime = h.CTime
						latestHistory = h
					}
				}
			}
			// Check KTCL
			if r.KtclHistoryID != "" {
				if h, ok := historyMap[r.KtclHistoryID]; ok {
					if h.CTime > latestTime {
						latestTime = h.CTime
						latestHistory = h
					}
				}
			}

			// If we found a latest reporting group, assign its values to the root (EnterpriseBase) fields
			if latestHistory != nil {
				r.ReportEnterpriseBase.Depth = latestHistory.Depth
				r.ReportEnterpriseBase.Width = latestHistory.Width
				r.ReportEnterpriseBase.Length = latestHistory.Length
				r.ReportEnterpriseBase.TrafficStatus = latestHistory.TrafficStatus
				r.ReportEnterpriseBase.FloodLevelName = latestHistory.FloodLevelName
				r.ReportEnterpriseBase.FloodLevelColor = latestHistory.FloodLevelColor
				r.ReportEnterpriseBase.IsFlooding = latestHistory.Depth > 0
			}
		}
	}

	return nil
}
