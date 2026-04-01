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

	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/sync/errgroup"
)

type Service interface {
	CreateReport(ctx context.Context, report *models.InundationReport, images []ImageContent) error
	AddUpdate(ctx context.Context, reportID string, update *models.InundationUpdate, userID string, userEmail string, images []ImageContent) error
	ListReports(ctx context.Context, orgID string) ([]*models.InundationReport, int64, error)
	ListReportsWithFilter(ctx context.Context, orgID, status, trafficStatus, query string, pointIDs []string, page, size int) ([]*models.InundationReport, int64, error)
	GetReport(ctx context.Context, reportID string) (*models.InundationReport, error)
	Resolve(ctx context.Context, reportID string, endTime int64) error

	// Points management
	GetPointsStatus(ctx context.Context, orgID string, pointIDs []string) ([]PointStatus, error)
	GetPointByID(ctx context.Context, id string) (*models.InundationPoint, error)
	CreatePoint(ctx context.Context, point models.InundationPoint) (string, error)
	UpdatePoint(ctx context.Context, id string, point models.InundationPoint) error
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
	ActiveReport *models.InundationReport `json:"active_report,omitempty"`
	LastReport   *models.InundationReport `json:"last_report,omitempty"`
	LastReportID string                   `json:"last_report_id"`
	Active       bool                     `json:"active"`
}

type ImageContent struct {
	Name     string
	MimeType string
	Reader   io.Reader
}

type service struct {
	inundationRepo       repository.Inundation
	inundationUpdateRepo repository.InundationUpdate
	inundationPointRepo  repository.InundationPoint
	orgRepo              repository.Organization
	driveSvc             googledrive.Service
	folderCache          map[string]string
	cacheMu              sync.RWMutex
}

func NewService(
	inundationRepo repository.Inundation,
	inundationUpdateRepo repository.InundationUpdate,
	inundationPointRepo repository.InundationPoint,
	orgRepo repository.Organization,
	driveSvc googledrive.Service,
) Service {
	return &service{
		inundationRepo:       inundationRepo,
		inundationUpdateRepo: inundationUpdateRepo,
		inundationPointRepo:  inundationPointRepo,
		orgRepo:              orgRepo,
		driveSvc:             driveSvc,
		folderCache:          make(map[string]string),
	}
}

func (s *service) CreateReport(ctx context.Context, report *models.InundationReport, images []ImageContent) error {
	// 1. Get Org to find Drive Folder
	org, err := s.orgRepo.GetByID(ctx, report.OrgID)
	if err != nil {
		return fmt.Errorf("failed to get organization for report: %w", err)
	}

	// 2. Resolve Dynamic Upload Folder
	folderID, err := s.resolveUploadFolder(ctx, org, "FLOOD", report.PointID)
	if err != nil {
		fmt.Printf("Warning: failed to resolve upload folder, falling back to org folder: %v\n", err)
		folderID, err = s.getOrgFolderID(ctx, org)
		if err != nil {
			return err
		}
	}

	// 3. Upload images to Google Drive in parallel
	if len(images) > 0 {
		g, gCtx := errgroup.WithContext(ctx)
		imageIDs := make([]string, len(images))

		for i, img := range images {
			i, img := i, img // closure capture
			g.Go(func() error {
				id, err := s.driveSvc.UploadFileSimple(gCtx, folderID, img.Name, img.MimeType, img.Reader)
				if err == nil {
					imageIDs[i] = id
				}
				return err
			})
		}

		if err := g.Wait(); err != nil {
			// Some might fail, we continue with what we have for robustness
		}

		for _, id := range imageIDs {
			if id != "" {
				report.Images = append(report.Images, id)
			}
		}
	}

	if report.Status == "resolved" || report.Status == "normal" {
		report.TrafficStatus = ""
	}

	if report.Status == "" {
		report.Status = "active"
	}

	// 3. Save report to DB
	return s.inundationRepo.Create(ctx, report)
}

func (s *service) AddUpdate(ctx context.Context, reportID string, update *models.InundationUpdate, userID string, userEmail string, images []ImageContent) error {
	// 1. Get Report to find Org/Folder
	report, err := s.inundationRepo.GetByID(ctx, reportID)
	if err != nil {
		return err
	}

	var org *models.Organization
	if report.OrgID != "" {
		org, err = s.orgRepo.GetByID(ctx, report.OrgID)
	} else {
		org, err = s.orgRepo.GetByCode(ctx, "TNHN")
		if err != nil {
			org, err = s.orgRepo.GetByCode(ctx, "tnhn")
		}
	}

	if err != nil {
		return fmt.Errorf("failed to get organization for report update: %w", err)
	}

	// 2. Resolve Dynamic Upload Folder
	folderID, err := s.resolveUploadFolder(ctx, org, "FLOOD", report.PointID)
	if err != nil {
		fmt.Printf("Warning: failed to resolve upload folder, falling back to org folder: %v\n", err)
		folderID, err = s.getOrgFolderID(ctx, org)
		if err != nil {
			return err
		}
	}

	// 3. Upload images in parallel
	if len(images) > 0 {
		g, gCtx := errgroup.WithContext(ctx)
		imageIDs := make([]string, len(images))

		for i, img := range images {
			i, img := i, img // closure capture
			g.Go(func() error {
				id, err := s.driveSvc.UploadFileSimple(gCtx, folderID, img.Name, img.MimeType, img.Reader)
				if err == nil {
					imageIDs[i] = id
				}
				return err
			})
		}

		_ = g.Wait()

		for _, id := range imageIDs {
			if id != "" {
				update.Images = append(update.Images, id)
			}
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

	if report.Status == "resolved" || report.Status == "normal" {
		report.TrafficStatus = ""
	}

	return s.inundationRepo.Update(ctx, report)
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

	if orgID != "" {
		f.AddWhere("org_id", "org_id", orgID)
	}
	if len(pointIDs) > 0 {
		f.AddWhere("point_id", "point_id", bson.M{"$in": pointIDs})
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
	return s.inundationRepo.Resolve(ctx, reportID, endTime)
}

func (s *service) GetPointByID(ctx context.Context, id string) (*models.InundationPoint, error) {
	return s.inundationPointRepo.GetByID(ctx, id)
}

func (s *service) CreatePoint(ctx context.Context, point models.InundationPoint) (string, error) {
	if point.Active == false {
		point.Active = true
	}
	return s.inundationPointRepo.Create(ctx, point)
}

func (s *service) GetPointsStatus(ctx context.Context, orgID string, pointIDs []string) ([]PointStatus, error) {
	// 1. Get all managed points
	var points []models.InundationPoint
	var err error
	if len(pointIDs) > 0 {
		points = make([]models.InundationPoint, 0, len(pointIDs))
		for _, pid := range pointIDs {
			p, err := s.inundationPointRepo.GetByID(ctx, pid)
			if err == nil && p != nil {
				points = append(points, *p)
			}
		}
	} else {
		points, err = s.inundationPointRepo.ListByOrg(ctx, orgID)
		if err != nil {
			return nil, err
		}
	}

	// 1.5 Get all organizations for mapping names
	orgs, _, _ := s.orgRepo.List(ctx, filter.NewPaginationFilter()) // Minimal filter
	orgMap := make(map[string]string)
	for _, o := range orgs {
		orgMap[o.ID] = o.Name
	}

	// 2. Get all active reports for this org (or all if orgID is empty)
	f := filter.NewPaginationFilter()
	if orgID != "" {
		f.AddWhere("org_id", "org_id", orgID)
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
	if orgID != "" {
		pipeline[0]["$match"].(bson.M)["org_id"] = orgID
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
			ActiveReport: activeReport,
			LastReport:   lastReport,
			LastReportID: lastID,
			Active:       p.Active,
		}
	}

	return result, nil
}

func (s *service) UpdatePoint(ctx context.Context, id string, point models.InundationPoint) error {
	point.ID = id
	return s.inundationPointRepo.Update(ctx, point)
}

func (s *service) DeletePoint(ctx context.Context, id string) error {
	return s.inundationPointRepo.Delete(ctx, id)
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

// resolveUploadFolder dynamically determines the target Google Drive folder: Org -> Type -> Station -> Date
func (s *service) resolveUploadFolder(ctx context.Context, org *models.Organization, dataType string, pointID string) (string, error) {
	// 1. Get Base Org Folder
	orgFolderID, err := s.getOrgFolderID(ctx, org)
	if err != nil {
		return "", err
	}

	dateFolderName := time.Now().Format("2006-01-02")
	dateKey := fmt.Sprintf("%s_%s_%s_%s", org.ID, dataType, pointID, dateFolderName)

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

	// 3. Get/Create Station Folder
	stationFolderName := "UNKNOWN_STATION"
	if pointID != "" {
		point, err := s.inundationPointRepo.GetByID(ctx, pointID)
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

	// 4. Get/Create Date Folder
	dateFolderID, err := s.driveSvc.FindOrCreateFolder(ctx, stationFolderID, dateFolderName)
	if err != nil {
		return "", fmt.Errorf("failed to handle date folder '%s': %w", dateFolderName, err)
	}

	if dateFolderID != "" {
		s.cacheMu.Lock()
		s.folderCache[dateKey] = dateFolderID
		s.cacheMu.Unlock()

		// Make the date folder public so files inside inherit the permission
		_ = s.driveSvc.SetPublic(ctx, dateFolderID)
	}

	return dateFolderID, nil
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
