package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) CreateReport(ctx context.Context, user *models.User, input models.InundationReportBase, images []ImageContent) (*models.InundationReport, error) {
	report := &models.InundationReport{
		InundationReportBase: input,
	}
	// 3. Get Point info
	if report.PointID == "" {
		return nil, web.BadRequest("Point ID is required")
	}
	// 1. Permission Check for Employee
	err := s.validAssigned(ctx, user, report.PointID)
	if err != nil {
		return nil, err
	}

	// Initialize basic fields if not set
	if report.OrgID == "" {
		report.OrgID = user.OrgID
	}
	report.UserID = user.ID
	report.UserName = user.Name
	report.UserEmail = user.Email

	point, err := s.inundationStationRepo.GetByID(ctx, report.PointID)
	if err != nil {
		return nil, err
	}

	// 4. Save images locally for async upload
	if len(images) > 0 {
		prefix := report.ID
		if prefix == "" {
			prefix = fmt.Sprintf("tmp_%d", time.Now().UnixNano())
		}
		savedPaths, err := s.saveLocalImages(prefix, images)
		if err != nil {
			fmt.Printf("Warning: failed to save some images locally: %v\n", err)
		}
		for _, path := range savedPaths {
			report.Images = append(report.Images, "local:"+path)
		}
	}

	if report.Status == "" {
		report.Status = "active"
	}

	// Calculate Flood Level
	level := s.calculateFloodLevel(ctx, report.Depth)
	if level != nil {
		report.FloodLevelName = level.Name
		report.FloodLevelColor = level.Color
		report.IsFlooding = level.IsFlooding
		if !level.IsFlooding {
			report.Status = "resolved"
			report.EndTime = time.Now().Unix()
		}
	} else {
		return nil, web.BadRequest("Flood level not found")
	}
	// 5. Save report to DB
	report.TrafficStatus = report.FloodLevelName

	// Pre-generate report ID so the initial update can reference it
	report.BeforeCreate("inu")

	// ALWAYS Create an initial update record for history/timeline consistency
	initialUpdate := &models.InundationUpdate{
		ReportID:  report.ID,
		Timestamp: report.CTime,
		InundationReportBase: models.InundationReportBase{
			UserID:        report.UserID,
			UserName:      report.UserName,
			UserEmail:     report.UserEmail,
			Description:   report.Description,
			Depth:         report.Depth,
			Length:        report.Length,
			Width:         report.Width,
			TrafficStatus: report.FloodLevelName,
			Images:        report.Images,
			IsFlooding:    report.IsFlooding,
		},
	}
	if initialUpdate.Description == "" {
		if report.IsFlooding {
			initialUpdate.Description = "Bắt đầu đợt ngập"
		} else {
			initialUpdate.Description = "Kiểm tra hiện trường (Chuẩn bị/Bình thường)"
		}
	}
	err = s.inundationUpdateRepo.Create(ctx, initialUpdate)
	if err != nil {
		return nil, err
	}
	report.LastReportID = initialUpdate.ID
	err = s.InundationReportRepo.Create(ctx, report)
	if err != nil {
		return nil, err
	}

	// Update station status
	if point != nil {
		if report.IsFlooding {
			point.ReportID = report.ID
		} else {
			point.ReportID = ""
		}
		point.LastReportID = report.ID
		err = s.inundationStationRepo.Update(ctx, point)
		if err != nil {
			fmt.Printf("ERROR: failed to update station status: %v\n", err)
		}
	}

	return report, nil
}

func (s *service) validAssigned(ctx context.Context, user *models.User, pointID string) error {
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

func (s *service) AddUpdate(ctx context.Context, user *models.User, reportID string, update *models.InundationUpdate, images []ImageContent, resolve bool) error {
	// 1. Get Report to find Org/Folder
	report, err := s.InundationReportRepo.GetByID(ctx, reportID)
	if err != nil {
		return err
	}
	fmt.Println("==========", report.PointID)
	// 2. Permission Check for Employee
	err = s.validAssigned(ctx, user, report.PointID)
	if err != nil {
		return err
	}

	// 3. Save images locally
	if len(images) > 0 {
		savedPaths, err := s.saveLocalImages(fmt.Sprintf("%s_%d", reportID, time.Now().UnixNano()), images)
		if err != nil {
			fmt.Printf("Warning: failed to save some update images locally: %v\n", err)
		}
		for _, path := range savedPaths {
			update.Images = append(update.Images, "local:"+path)
		}
	}

	update.ReportID = reportID
	update.UserID = user.ID
	update.UserEmail = user.Email
	if update.Timestamp == 0 {
		update.Timestamp = time.Now().Unix()
	}

	// 4. Inherit status from main report if not provided in update

	if update.Length == "" {
		update.Length = report.Length
	}
	if update.Width == "" {
		update.Width = report.Width
	}
	// Calculate level for update
	level := s.calculateFloodLevel(ctx, update.Depth)
	if level != nil {
		update.FloodLevelName = level.Name
		update.FloodLevelColor = level.Color
		update.IsFlooding = level.IsFlooding
	}

	// 5. Save update to dedicated collection
	err = s.inundationUpdateRepo.Create(ctx, update)
	if err != nil {
		return err
	}

	// Force resolve if depth indicates it's no longer flooded by configuration
	if level != nil && !level.IsFlooding {
		resolve = true
	}

	// 6. Also update the main report's current status/dimensions
	report.TrafficStatus = update.FloodLevelName
	report.Length = update.Length
	report.Width = update.Width
	report.Depth = update.Depth
	report.FloodLevelName = update.FloodLevelName
	report.FloodLevelColor = update.FloodLevelColor
	report.Description = update.Description
	report.Images = update.Images

	err = s.InundationReportRepo.Update(ctx, report)
	if err != nil {
		return err
	}

	// 7. Resolve if flag set
	if resolve {
		_ = s.Resolve(ctx, reportID, 0)
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
func (s *service) UpdateReport(ctx context.Context, user *models.User, id string, report *models.InundationReportBase, images []ImageContent) error {
	existing, err := s.InundationReportRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Permission Checks
	isAllowedAll := user.Role == "super_admin" || user.IsCompany
	if user.IsEmployee {
		// Employees can ONLY edit if NeedsCorrection is true AND it belongs to their org
		if !existing.NeedsCorrection {
			return web.Forbidden("Chỉ được phép sửa thông tin khi có yêu cầu (nhận xét) từ người rà soát")
		}
		if existing.OrgID != user.OrgID {
			return web.Unauthorized("Bạn không có quyền chỉnh sửa báo cáo của đơn vị khác")
		}
	} else if !isAllowedAll {
		// Non-employee manager check (Ownership or Shared)
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
			}
		}
		if !isAuthorized {
			return web.Unauthorized("Bạn không có quyền chỉnh sửa báo cáo này")
		}
	}

	existing.Depth = report.Depth
	existing.Length = report.Length
	existing.Width = report.Width
	existing.Description = report.Description

	level := s.calculateFloodLevel(ctx, existing.Depth)
	if level != nil {
		existing.FloodLevelName = level.Name
		existing.FloodLevelColor = level.Color
		existing.IsFlooding = level.IsFlooding
	}
	existing.TrafficStatus = existing.FloodLevelName
	existing.NeedsCorrection = false
	existing.NeedsCorrectionUpdateID = ""

	// If updated to a non-flooding level, we should clear point status and resolve later
	shouldResolve := level != nil && !level.IsFlooding

	if len(images) > 0 {
		savedPaths, err := s.saveLocalImages(id, images)
		if err != nil {
			fmt.Printf("Warning: failed to save some update images locally: %v\n", err)
		}
		newImages := []string{}
		for _, path := range savedPaths {
			newImages = append(newImages, "local:"+path)
		}
		if len(newImages) > 0 {
			existing.Images = newImages
		}
	}

	err = s.InundationReportRepo.Update(ctx, existing)
	if err != nil {
		return err
	}

	// Create a new update for history (Timeline)
	newUpdate := &models.InundationUpdate{
		ReportID:  id,
		Timestamp: time.Now().Unix(),
		InundationReportBase: models.InundationReportBase{
			UserID:          user.ID,
			UserEmail:       user.Email,
			UserName:        user.Name,
			Description:     "Chỉnh sửa thông tin báo cáo (theo yêu cầu rà soát)",
			Depth:           existing.Depth,
			FloodLevelName:  existing.FloodLevelName,
			FloodLevelColor: existing.FloodLevelColor,
			Length:          existing.Length,
			Width:           existing.Width,
			TrafficStatus:   existing.TrafficStatus,
			Images:          existing.Images,
			IsFlooding:      existing.IsFlooding,
		},
		ReportReviewBase: models.ReportReviewBase{
			IsReviewUpdated: true,
		},
	}
	_ = s.inundationUpdateRepo.Create(ctx, newUpdate)

	if shouldResolve {
		_ = s.Resolve(ctx, id, 0)
	}

	return nil
}
func (s *service) UpdateSurvey(ctx context.Context, user *models.User, id string, input *models.ReportSurveyBase, images []ImageContent) error {
	existing, err := s.InundationReportRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

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
			return web.Unauthorized("Bạn không có quyền cập nhật thông tin khảo sát")
		}
	}

	existing.SurveyChecked = input.SurveyChecked
	existing.SurveyNote = input.SurveyNote
	existing.SurveyUserID = user.ID
	existing.SurveyUserName = user.Name
	existing.SurveyUpdatedAt = time.Now().Unix()

	if len(images) > 0 {
		savedPaths, err := s.saveLocalImages(fmt.Sprintf("%s_survey_%d", id, time.Now().Unix()), images)
		if err == nil {
			newImages := []string{}
			for _, path := range savedPaths {
				newImages = append(newImages, "local:"+path)
			}
			existing.SurveyImages = newImages
		}
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
			UserID:      user.ID,
			UserEmail:   user.Email,
			UserName:    user.Name,
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

	return nil
}
func (s *service) UpdateMech(ctx context.Context, user *models.User, id string, input *models.ReportMechBase, images []ImageContent) error {
	existing, err := s.InundationReportRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

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
			return web.Unauthorized("Bạn không có quyền cập nhật thông tin XN Cơ giới")
		}
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
		savedPaths, err := s.saveLocalImages(fmt.Sprintf("%s_mech_%d", id, time.Now().Unix()), images)
		if err == nil {
			newImages := []string{}
			for _, path := range savedPaths {
				newImages = append(newImages, "local:"+path)
			}
			existing.MechImages = newImages
		}
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
			UserID:          user.ID,
			UserEmail:       user.Email,
			UserName:        user.Name,
			Description:     "Cập nhật dữ liệu từ XN Cơ giới",
			Depth:           existing.Depth,
			FloodLevelName:  existing.FloodLevelName,
			FloodLevelColor: existing.FloodLevelColor,
			Length:          existing.Length,
			Width:           existing.Width,
			TrafficStatus:   existing.TrafficStatus,
			IsFlooding:      existing.IsFlooding,
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

	return nil
}

func (s *service) QuickFinish(ctx context.Context, user *models.User, pointID string) error {
	// 1. Find the active report for this point
	inundation, err := s.GetPointByID(ctx, pointID)
	if err != nil {
		return err
	}

	// 2. Permission check
	err = s.validAssigned(ctx, user, pointID)
	if err != nil {
		return err
	}

	// 3. Create a final update record
	endTime := time.Now().Unix()
	finalUpdate := &models.InundationUpdate{
		ReportID:  inundation.ReportID,
		Timestamp: endTime,
		InundationReportBase: models.InundationReportBase{
			UserID:        user.ID,
			UserEmail:     user.Email,
			UserName:      user.Name,
			Description:   "Kết thúc nhanh đợt ngập",
			Depth:         0,
			TrafficStatus: "Bình thường",
		},
	}
	_ = s.inundationUpdateRepo.Create(ctx, finalUpdate)

	// 4. Resolve the report
	return s.Resolve(ctx, inundation.ReportID, endTime)
}
