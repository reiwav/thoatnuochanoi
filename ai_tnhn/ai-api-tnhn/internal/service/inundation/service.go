package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/googledrive"
	"context"
	"fmt"
	"io"
	"sync"
	"time"

	"os"
	"path/filepath"

	"go.mongodb.org/mongo-driver/bson"
)

type Service interface {
	CreateReport(ctx context.Context, report *models.InundationReport, images []ImageContent) error
	AddUpdate(ctx context.Context, reportID string, update *models.InundationUpdate, userID string, userEmail string, images []ImageContent) error
	ListReports(ctx context.Context, orgID string) ([]*models.InundationReport, int64, error)
	ListReportsWithFilter(ctx context.Context, orgID, status, trafficStatus, query string, pointIDs []string, page, size int) ([]*models.InundationReport, int64, error)
	GetReport(ctx context.Context, reportID string) (*models.InundationReport, error)
	Resolve(ctx context.Context, reportID string, endTime int64) error
	UpdateReport(ctx context.Context, id string, report *models.InundationReport, images []ImageContent) error

	// Review and Correction
	ReviewReport(ctx context.Context, reportID, comment, reviewerID, reviewerEmail, reviewerName string) error
	ReviewUpdate(ctx context.Context, updateID, comment, reviewerID, reviewerEmail, reviewerName string) error
	GetUpdateByID(ctx context.Context, updateID string) (*models.InundationUpdate, error)
	UpdateUpdateContent(ctx context.Context, updateID string, update *models.InundationUpdate, images []ImageContent) error

	// Points management
	GetPointsStatus(ctx context.Context, orgID string, pointIDs []string) ([]PointStatus, error)
	GetPointByID(ctx context.Context, id string) (*models.InundationStation, error)
	CreatePoint(ctx context.Context, point models.InundationStation) (string, error)
	UpdatePoint(ctx context.Context, id string, point models.InundationStation) error
	DeletePoint(ctx context.Context, id string) error

	// Org helpers for visibility
	GetOrgByCode(ctx context.Context, code string) (*models.Organization, error)
	GetOrgByID(ctx context.Context, id string) (*models.Organization, error)
	ListOrganizations(ctx context.Context) ([]*models.Organization, error)
}

type PointStatus struct {
	ID           string                   `json:"id"`
	OrgID        string                   `json:"org_id"`
	OrgName      string                   `json:"org_name"`
	Name         string                   `json:"name"`
	Address      string                   `json:"address"`
	Lat          string                   `json:"lat"`
	Lng          string                   `json:"lng"`
	Status       string                   `json:"status"` // active, normal
	ReportID     string                   `json:"report_id"`
	ActiveReport *models.InundationReport `json:"active_report,omitempty"`
	LastReport   *models.InundationReport `json:"last_report,omitempty"`
	LastReportID string                   `json:"last_report_id"`
	Active       bool                     `json:"active"`
	CreatedAt    int64                    `json:"created_at"`
}

type ImageContent struct {
	Name     string
	MimeType string
	Reader   io.Reader
}

type service struct {
	inundationRepo        repository.Inundation
	inundationUpdateRepo  repository.InundationUpdate
	inundationStationRepo repository.InundationStation
	orgRepo               repository.Organization
	driveSvc              googledrive.Service
	folderCache           map[string]string
	cacheMu               sync.RWMutex
	syncWorker            *SyncWorker
}

func NewService(
	inundationRepo repository.Inundation,
	inundationUpdateRepo repository.InundationUpdate,
	inundationStationRepo repository.InundationStation,
	orgRepo repository.Organization,
	driveSvc googledrive.Service,
) Service {
	svc := &service{
		inundationRepo:        inundationRepo,
		inundationUpdateRepo:  inundationUpdateRepo,
		inundationStationRepo: inundationStationRepo,
		orgRepo:               orgRepo,
		driveSvc:              driveSvc,
		folderCache:           make(map[string]string),
	}

	// 1. Initialize background sync worker
	svc.syncWorker = NewSyncWorker(
		inundationRepo,
		inundationUpdateRepo,
		orgRepo,
		driveSvc,
		svc.resolveUploadFolder, // Pass helper function
	)

	// 2. Start the worker loop (Startup scan + channel listener)
	svc.syncWorker.Start()

	return svc
}

func (s *service) CreateReport(ctx context.Context, report *models.InundationReport, images []ImageContent) error {
	// 1. Get Org to find Drive Folder
	// 3. Save images locally for async upload
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

	if report.Status == "resolved" || report.Status == "normal" {
		report.TrafficStatus = ""
	}

	if report.Status == "" {
		report.Status = "active"
	}

	// 2. Check if point already has an active report. If so, convert this to an update.
	if report.Status == "active" && report.PointID != "" {
		point, err := s.inundationStationRepo.GetByID(ctx, report.PointID)
		if err == nil && point != nil && point.ReportID != "" {
			// Transparently route to AddUpdate to avoid duplicate active sessions
			update := &models.InundationUpdate{
				Description:   report.Description,
				Depth:         report.Depth,
				Length:        report.Length,
				Width:         report.Width,
				TrafficStatus: report.TrafficStatus,
				Timestamp:     time.Now().Unix(),
			}
			return s.AddUpdate(ctx, point.ReportID, update, report.UserID, report.UserEmail, images)
		}
	}

	// 3. Save report to DB
	err := s.inundationRepo.Create(ctx, report)
	if err != nil {
		return err
	}

	// NEW: Update station's report_id if it's an active report
	if report.Status == "active" && report.PointID != "" {
		point, err := s.inundationStationRepo.GetByID(ctx, report.PointID)
		if err == nil && point != nil {
			point.ReportID = report.ID
			_ = s.inundationStationRepo.Update(ctx, *point)
		}
	}

	// Trigger immediate sync task
	if len(images) > 0 {
		s.syncWorker.Enqueue(report.ID, TaskTypeReport)
	}

	return nil
}

func (s *service) AddUpdate(ctx context.Context, reportID string, update *models.InundationUpdate, userID string, userEmail string, images []ImageContent) error {
	// 1. Get Report to find Org/Folder
	report, err := s.inundationRepo.GetByID(ctx, reportID)
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
	update.UserID = userID
	update.UserEmail = userEmail
	if update.Timestamp == 0 {
		update.Timestamp = time.Now().Unix()
	}

	// 3. Inherit status from main report if not provided in update
	if update.TrafficStatus == "" {
		update.TrafficStatus = report.TrafficStatus
	}
	if update.Length == "" {
		update.Length = report.Length
	}
	if update.Width == "" {
		update.Width = report.Width
	}
	if update.Depth == "" {
		update.Depth = report.Depth
	}

	// 4. Save update to dedicated collection
	err = s.inundationUpdateRepo.Create(ctx, update)
	if err != nil {
		return err
	}

	// 5. Also update the main report's current status/dimensions
	report.TrafficStatus = update.TrafficStatus
	report.Length = update.Length
	report.Width = update.Width
	report.Depth = update.Depth
	report.Description = update.Description
	report.Images = update.Images

	if report.Status == "resolved" || report.Status == "normal" {
		report.TrafficStatus = ""
	}

	err = s.inundationRepo.Update(ctx, report)
	if err != nil {
		return err
	}

	// Trigger immediate sync task
	if len(images) > 0 {
		s.syncWorker.Enqueue(update.ID, TaskTypeUpdate)
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
	return s.inundationRepo.List(ctx, f)
}

func (s *service) ListReportsWithFilter(ctx context.Context, orgID, status, trafficStatus, query string, pointIDs []string, page, size int) ([]*models.InundationReport, int64, error) {
	f := filter.NewPaginationFilter()
	f.Page = int64(page + 1) // filter uses 1-based page
	f.PerPage = int64(size)

	if len(pointIDs) > 0 && orgID != "" {
		f.AddWhere("org_id_or_shared_or_points", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
			{"point_id": bson.M{"$in": pointIDs}},
		})
	} else if len(pointIDs) > 0 {
		f.AddWhere("point_id", "point_id", bson.M{"$in": pointIDs})
	} else if orgID != "" {
		f.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
		})
	}
	if status != "" {
		f.AddWhere("status", "status", status)
	}
	if trafficStatus != "" {
		f.AddWhere("traffic_status", "traffic_status", trafficStatus)
	}
	if query != "" {
		f.AddWhere("street_name", "street_name", bson.M{"$regex": query, "$options": "i"})
	}

	f.SetOrderBy("-created_at")
	reports, total, err := s.inundationRepo.List(ctx, f)
	if err != nil {
		return nil, 0, err
	}

	// NEW: Fetch updates for all reports in batch
	if len(reports) > 0 {
		reportIDs := make([]string, len(reports))
		for i, r := range reports {
			reportIDs[i] = r.ID
		}

		updatesMap := make(map[string][]models.InundationUpdate)
		// Assuming we have or can implement ListByReportIDs or just iterate if repository is simple
		// For now, let's look for all updates belonging to these reports
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
			if r.Status == "resolved" || r.Status == "normal" {
				r.TrafficStatus = ""
			}
			if u, ok := updatesMap[r.ID]; ok {
				r.Updates = u
			}
		}
	}

	return reports, total, nil
}

func (s *service) GetReport(ctx context.Context, reportID string) (*models.InundationReport, error) {
	report, err := s.inundationRepo.GetByID(ctx, reportID)
	if err != nil {
		return nil, err
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

func (s *service) Resolve(ctx context.Context, reportID string, endTime int64) error {
	if endTime == 0 {
		endTime = time.Now().Unix()
	}

	// NEW: Clear station's report_id when report is resolved
	report, err := s.inundationRepo.GetByID(ctx, reportID)
	if err == nil && report != nil && report.PointID != "" {
		point, err := s.inundationStationRepo.GetByID(ctx, report.PointID)
		if err == nil && point != nil && point.ReportID == reportID {
			point.ReportID = ""
			_ = s.inundationStationRepo.Update(ctx, *point)
		}
	}

	return s.inundationRepo.Resolve(ctx, reportID, endTime)
}

func (s *service) UpdateReport(ctx context.Context, id string, report *models.InundationReport, images []ImageContent) error {
	existing, err := s.inundationRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	existing.Depth = report.Depth
	existing.Length = report.Length
	existing.Width = report.Width
	existing.Description = report.Description
	existing.TrafficStatus = report.TrafficStatus
	existing.NeedsCorrection = false
	existing.NeedsCorrectionUpdateID = ""

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

	err = s.inundationRepo.Update(ctx, existing)
	if err != nil {
		return err
	}

	// Trigger immediate sync task
	if len(images) > 0 {
		s.syncWorker.Enqueue(id, TaskTypeReport)
	}

	return nil
}

func (s *service) ReviewReport(ctx context.Context, reportID, comment, reviewerID, reviewerEmail, reviewerName string) error {
	report, err := s.inundationRepo.GetByID(ctx, reportID)
	if err != nil {
		return err
	}
	if report.Status != "active" {
		return fmt.Errorf("chỉ được phép nhận xét khi báo cáo đang ở trạng thái active")
	}
	report.ReviewComment = comment
	report.ReviewerId = reviewerID
	report.ReviewerEmail = reviewerEmail
	report.ReviewerName = reviewerName
	report.NeedsCorrection = true
	return s.inundationRepo.Update(ctx, report)
}

func (s *service) ReviewUpdate(ctx context.Context, updateID, comment, reviewerID, reviewerEmail, reviewerName string) error {
	update, err := s.inundationUpdateRepo.GetByID(ctx, updateID)
	if err != nil {
		return err
	}

	report, err := s.inundationRepo.GetByID(ctx, update.ReportID)
	if err != nil {
		return err
	}
	if report.Status != "active" {
		return fmt.Errorf("chỉ được phép nhận xét khi báo cáo đang ở trạng thái active")
	}

	update.ReviewComment = comment
	update.ReviewerId = reviewerID
	update.ReviewerEmail = reviewerEmail
	update.ReviewerName = reviewerName
	update.NeedsCorrection = true
	if err := s.inundationUpdateRepo.Update(ctx, update); err != nil {
		return err
	}

	// Gắn cờ lên report: update nào cần sửa
	report.NeedsCorrection = true
	report.NeedsCorrectionUpdateID = updateID
	return s.inundationRepo.Update(ctx, report)
}

func (s *service) GetUpdateByID(ctx context.Context, updateID string) (*models.InundationUpdate, error) {
	return s.inundationUpdateRepo.GetByID(ctx, updateID)
}

func (s *service) UpdateUpdateContent(ctx context.Context, updateID string, updatedData *models.InundationUpdate, images []ImageContent) error {
	update, err := s.inundationUpdateRepo.GetByID(ctx, updateID)
	if err != nil {
		return err
	}

	// Lưu lịch sử bản cũ trước khi cập nhật
	snapshot := map[string]interface{}{
		"description":    update.Description,
		"depth":          update.Depth,
		"length":         update.Length,
		"width":          update.Width,
		"traffic_status": update.TrafficStatus,
		"images":         update.Images,
		"timestamp":      update.Timestamp,
	}
	update.OldData = append(update.OldData, snapshot)

	update.Description = updatedData.Description
	update.Depth = updatedData.Depth
	update.Length = updatedData.Length
	update.Width = updatedData.Width
	update.TrafficStatus = updatedData.TrafficStatus
	update.NeedsCorrection = false

	if len(images) > 0 {
		savedPaths, err := s.saveLocalImages(updateID, images)
		if err != nil {
			fmt.Printf("Warning: failed to save some content update images locally: %v\n", err)
		}
		newImages := []string{}
		for _, path := range savedPaths {
			newImages = append(newImages, "local:"+path)
		}
		if len(newImages) > 0 {
			update.Images = newImages
		}
	}

	err = s.inundationUpdateRepo.Update(ctx, update)
	if err != nil {
		return err
	}

	// Trigger immediate sync task
	if len(images) > 0 {
		s.syncWorker.Enqueue(updateID, TaskTypeUpdate)
	}

	// Sync back to main report if this was the latest info
	mainReport, err := s.inundationRepo.GetByID(ctx, update.ReportID)
	if err == nil {
		mainReport.Depth = update.Depth
		mainReport.Length = update.Length
		mainReport.Width = update.Width
		mainReport.TrafficStatus = update.TrafficStatus
		mainReport.Description = update.Description
		mainReport.Images = update.Images
		mainReport.NeedsCorrection = false
		mainReport.NeedsCorrectionUpdateID = ""
		_ = s.inundationRepo.Update(ctx, mainReport)
	}

	return nil
}

func (s *service) GetPointByID(ctx context.Context, id string) (*models.InundationStation, error) {
	return s.inundationStationRepo.GetByID(ctx, id)
}

func (s *service) CreatePoint(ctx context.Context, point models.InundationStation) (string, error) {
	if point.Active == false {
		point.Active = true
	}
	return s.inundationStationRepo.Create(ctx, point)
}

func (s *service) GetPointsStatus(ctx context.Context, orgID string, pointIDs []string) ([]PointStatus, error) {
	// 1. Get all managed points (Union of owned points and shared points)
	allPointsMap := make(map[string]models.InundationStation)

	// A. Get points owned by or shared with this organization
	if orgID != "" {
		pf := filter.NewPaginationFilter()
		pf.PerPage = 1000
		pf.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
		})
		ownedPoints, _, err := s.inundationStationRepo.List(ctx, pf)
		if err == nil {
			for _, p := range ownedPoints {
				allPointsMap[p.ID] = p
			}
		}
	}

	// B. Get points explicitly shared via pointIDs list
	if len(pointIDs) > 0 {
		for _, pid := range pointIDs {
			if _, exists := allPointsMap[pid]; !exists {
				p, err := s.inundationStationRepo.GetByID(ctx, pid)
				if err == nil && p != nil {
					allPointsMap[p.ID] = *p
				}
			}
		}
	}

	// C. If both are empty and user is likely a Super Admin (orgID == "" and pointIDs empty),
	// ListByOrg("") will fetch all active points.
	if orgID == "" && len(pointIDs) == 0 {
		allPoints, err := s.inundationStationRepo.ListByOrg(ctx, "")
		if err == nil {
			for _, p := range allPoints {
				allPointsMap[p.ID] = p
			}
		}
	}

	points := make([]models.InundationStation, 0, len(allPointsMap))
	for _, p := range allPointsMap {
		points = append(points, p)
	}

	if len(points) == 0 {
		return []PointStatus{}, nil
	}

	// 1.5 Get all organizations for mapping names
	orgs, _, _ := s.orgRepo.List(ctx, filter.NewPaginationFilter()) // Minimal filter
	orgMap := make(map[string]string)
	for _, o := range orgs {
		orgMap[o.ID] = o.Name
	}

	// 2. Get all active reports for managed points (Union of owned and shared)
	f := filter.NewPaginationFilter()
	if len(pointIDs) > 0 && orgID != "" {
		f.AddWhere("org_id_or_points", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
			{"point_id": bson.M{"$in": pointIDs}},
		})
	} else if len(pointIDs) > 0 {
		f.AddWhere("point_id", "point_id", bson.M{"$in": pointIDs})
	} else if orgID != "" {
		f.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
		})
	}
	f.AddWhere("status", "status", "active")
	activeReports, _, err := s.inundationRepo.List(ctx, f)
	if err != nil {
		return nil, err
	}

	// 3. Map reports to points
	reportsByPoint := make(map[string]*models.InundationReport)
	for _, r := range activeReports {
		if r.PointID != "" {
			reportsByPoint[r.PointID] = r
		}
	}

	// 3.5 Find last report ID for each point (even if resolved)
	lastReportIDs := make(map[string]string)
	pipeline := []bson.M{
		{"$match": bson.M{"deleted_at": 0}},
		{"$sort": bson.M{"start_time": -1}},
		{"$group": bson.M{"_id": "$point_id", "last_id": bson.M{"$first": "$_id"}}},
	}
	if len(pointIDs) > 0 && orgID != "" {
		pipeline[0]["$match"].(bson.M)["$or"] = []bson.M{
			{"org_id": orgID},
			{"point_id": bson.M{"$in": pointIDs}},
		}
	} else if len(pointIDs) > 0 {
		pipeline[0]["$match"].(bson.M)["point_id"] = bson.M{"$in": pointIDs}
	} else if orgID != "" {
		pipeline[0]["$match"].(bson.M)["$or"] = []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
		}
	}

	var pipeRes []struct {
		PointID string `bson:"_id"`
		LastID  string `bson:"last_id"`
	}
	// We use the underlying R_Pipe from the table if available
	if repo, ok := s.inundationRepo.(interface {
		R_Pipe(ctx context.Context, pipeline []bson.M, res interface{}) error
	}); ok {
		_ = repo.R_Pipe(ctx, pipeline, &pipeRes)
		for _, item := range pipeRes {
			if item.PointID != "" {
				lastReportIDs[item.PointID] = item.LastID
			}
		}
	}

	// NEW: Fetch all last reports to get images
	var lastIDs []string
	for _, id := range lastReportIDs {
		lastIDs = append(lastIDs, id)
	}

	lastReportsMap := make(map[string]*models.InundationReport)
	if len(lastIDs) > 0 {
		hf := filter.NewPaginationFilter()
		hf.PerPage = 1000
		hf.AddWhere("_id", "_id", bson.M{"$in": lastIDs})
		reports, _, _ := s.inundationRepo.List(ctx, hf)
		for _, r := range reports {
			// Populate updates for last reports too
			updates, _ := s.inundationUpdateRepo.ListByReportID(ctx, r.ID)
			if len(updates) > 0 {
				r.Updates = make([]models.InundationUpdate, len(updates))
				for i, u := range updates {
					r.Updates[i] = *u
				}
			}
			lastReportsMap[r.ID] = r
		}
	}

	// 4. Build merged result
	result := make([]PointStatus, len(points))
	for i, p := range points {
		status := "normal"
		var activeReport *models.InundationReport
		if report, ok := reportsByPoint[p.ID]; ok {
			status = "active"
			// Fetch updates for active report so dashboard can show history/latest info
			updates, _ := s.inundationUpdateRepo.ListByReportID(ctx, report.ID)
			if len(updates) > 0 {
				report.Updates = make([]models.InundationUpdate, len(updates))
				for i, u := range updates {
					report.Updates[i] = *u
				}
			}
			activeReport = report
		}

		lastID := lastReportIDs[p.ID]
		lastReport := lastReportsMap[lastID]
		if lastReport != nil && (lastReport.Status == "resolved" || lastReport.Status == "normal") {
			lastReport.TrafficStatus = ""
		}

		result[i] = PointStatus{
			ID:           p.ID,
			OrgID:        p.OrgID,
			OrgName:      orgMap[p.OrgID],
			Name:         p.Name,
			Address:      p.Address,
			Lat:          p.Lat,
			Lng:          p.Lng,
			Status:       status,
			ReportID:     p.ReportID,
			ActiveReport: activeReport,
			LastReport:   lastReport,
			LastReportID: lastID,
			Active:       p.Active,
			CreatedAt:    p.CTime,
		}
	}

	return result, nil
}

func (s *service) UpdatePoint(ctx context.Context, id string, point models.InundationStation) error {
	point.ID = id
	return s.inundationStationRepo.Update(ctx, point)
}

func (s *service) DeletePoint(ctx context.Context, id string) error {
	return s.inundationStationRepo.Delete(ctx, id)
}
func (s *service) getOrgFolderID(ctx context.Context, org *models.Organization) (string, error) {
	folderID := org.DriveFolderID
	// Treat empty or "." as invalid
	if folderID == "" || folderID == "." {
		fmt.Printf("Org %s has invalid DriveFolderID '%s'. Attempting to create/find a valid one...\n", org.Name, folderID)
		newFolderID, err := s.driveSvc.CreateOrgFolder(ctx, org.Name)
		if err != nil {
			return "", fmt.Errorf("failed to ensure org folder for '%s': %w", org.Name, err)
		}

		// Update org in DB so we don't have to keep doing this
		org.DriveFolderID = newFolderID
		_ = s.orgRepo.Upsert(ctx, org)
		return newFolderID, nil
	}
	return folderID, nil
}

// resolveUploadFolder dynamically determines the target Google Drive folder: Org -> FLOOD -> Station -> Year -> Month -> Day
func (s *service) resolveUploadFolder(ctx context.Context, org *models.Organization, dataType string, pointID string) (string, error) {
	// 1. Get Base Org Folder
	orgFolderID, err := s.getOrgFolderID(ctx, org)
	if err != nil {
		return "", err
	}

	now := time.Now()
	yearStr := now.Format("2006")
	monthStr := now.Format("01")
	dayStr := now.Format("02")

	// Use a hierarchical cache key to reflect the new structure
	dateKey := fmt.Sprintf("%s_%s_%s_%s_%s_%s", org.ID, dataType, pointID, yearStr, monthStr, dayStr)

	s.cacheMu.RLock()
	cachedID, ok := s.folderCache[dateKey]
	s.cacheMu.RUnlock()
	if ok {
		return cachedID, nil
	}

	// 2. Get/Create Type Folder (e.g., FLOOD)
	typeFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, orgFolderID, dataType)
	if err != nil {
		return "", fmt.Errorf("failed to handle type folder '%s': %w", dataType, err)
	}

	// 3. Get/Create Station Folder (e.g., Ngõ 123_ID...)
	stationFolderName := "UNKNOWN_STATION"
	if pointID != "" {
		point, err := s.inundationStationRepo.GetByID(ctx, pointID)
		if err == nil && point != nil {
			stationFolderName = fmt.Sprintf("%s_%s", point.Name, point.ID)
		} else {
			stationFolderName = fmt.Sprintf("ID_%s", pointID)
		}
	}
	stationFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, typeFolderID, stationFolderName)
	if err != nil {
		return "", fmt.Errorf("failed to handle station folder '%s': %w", stationFolderName, err)
	}

	// 4. Get/Create Year Folder
	yearFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, stationFolderID, yearStr)
	if err != nil {
		return "", fmt.Errorf("failed to handle year folder '%s': %w", yearStr, err)
	}

	// 5. Get/Create Month Folder
	monthFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, yearFolderID, monthStr)
	if err != nil {
		return "", fmt.Errorf("failed to handle month folder '%s': %w", monthStr, err)
	}

	// 6. Get/Create Date (Day) Folder
	dayFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, monthFolderID, dayStr)
	if err != nil {
		return "", fmt.Errorf("failed to handle day folder '%s': %w", dayStr, err)
	}

	if dayFolderID != "" {
		s.cacheMu.Lock()
		s.folderCache[dateKey] = dayFolderID
		s.cacheMu.Unlock()

		// Make the day folder public so files inside inherit the permission
		_ = s.driveSvc.SetPublic(ctx, dayFolderID)
	}

	return dayFolderID, nil
}

func (s *service) GetOrgByCode(ctx context.Context, code string) (*models.Organization, error) {
	return s.orgRepo.GetByCode(ctx, code)
}

func (s *service) GetOrgByID(ctx context.Context, id string) (*models.Organization, error) {
	return s.orgRepo.GetByID(ctx, id)
}

func (s *service) ListOrganizations(ctx context.Context) ([]*models.Organization, error) {
	f := filter.NewPaginationFilter()
	f.PerPage = 1000
	orgs, _, err := s.orgRepo.List(ctx, f)
	return orgs, err
}

// saveLocalImages saves images to a temporary directory on disk and returns the relative paths
func (s *service) saveLocalImages(prefix string, images []ImageContent) ([]string, error) {
	baseDir := "uploads/inundation_tmp"
	if _, err := os.Stat(baseDir); os.IsNotExist(err) {
		_ = os.MkdirAll(baseDir, 0755)
	}

	var savedPaths []string
	for i, img := range images {
		// Use a unique name to avoid collisions
		fileName := fmt.Sprintf("%s_%d_%d%s", prefix, time.Now().UnixNano(), i, filepath.Ext(img.Name))
		if filepath.Ext(img.Name) == "" {
			// Fallback extension if missing
			fileName += ".jpg"
		}

		relPath := filepath.Join("inundation_tmp", fileName)
		fullPath := filepath.Join("uploads", relPath)

		out, err := os.Create(fullPath)
		if err != nil {
			return savedPaths, fmt.Errorf("failed to create local file: %w", err)
		}

		_, err = io.Copy(out, img.Reader)
		out.Close()
		if err != nil {
			return savedPaths, fmt.Errorf("failed to save local file content: %w", err)
		}

		savedPaths = append(savedPaths, relPath)
	}

	return savedPaths, nil
}
