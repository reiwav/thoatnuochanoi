package emergency_construction

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/googledrive"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/xuri/excelize/v2"
	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/sync/errgroup"
)

type ImageContent struct {
	Name     string
	MimeType string
	Reader   io.Reader
}

type Service interface {
	Create(ctx context.Context, item *models.EmergencyConstruction, userID string) error
	Update(ctx context.Context, id string, item *models.EmergencyConstruction, userID string) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.EmergencyConstruction, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstruction, int64, error)
	ListHistory(ctx context.Context, filter filter.Filter) ([]*models.EmergencyConstructionProgress, int64, error)
	GetHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionHistory, error)

	// Progress Reporting
	ReportProgress(ctx context.Context, progress *models.EmergencyConstructionProgress, images []ImageContent) error
	UpdateProgress(ctx context.Context, id string, progress *models.EmergencyConstructionProgress, images []ImageContent) error
	GetProgressByID(ctx context.Context, id string) (*models.EmergencyConstructionProgress, error)
	GetProgressHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionProgress, error)
	ExportExcelToDrive(ctx context.Context, date string, orgID string) (string, error)
}

type service struct {
	repo         repository.EmergencyConstruction
	historyRepo  repository.EmergencyConstructionHistory
	progressRepo repository.EmergencyConstructionProgress
	userRepo     repository.User
	orgRepo      repository.Organization
	driveSvc     googledrive.Service
	folderCache  map[string]string
	cacheMu      sync.RWMutex
}

func NewService(repo repository.EmergencyConstruction, historyRepo repository.EmergencyConstructionHistory, progressRepo repository.EmergencyConstructionProgress, userRepo repository.User, orgRepo repository.Organization, driveSvc googledrive.Service) Service {
	return &service{
		repo:         repo,
		historyRepo:  historyRepo,
		progressRepo: progressRepo,
		userRepo:     userRepo,
		orgRepo:      orgRepo,
		driveSvc:     driveSvc,
		folderCache:  make(map[string]string),
	}
}

func (s *service) Create(ctx context.Context, item *models.EmergencyConstruction, userID string) error {
	err := s.repo.Upsert(ctx, item)
	if err != nil {
		return err
	}

	// Log history
	history := &models.EmergencyConstructionHistory{
		ConstructionID: item.ID,
		Action:         "create",
		NewStatus:      item.Status,
		UpdatedBy:      userID,
		Note:           "Created new emergency construction",
	}
	_ = s.historyRepo.Create(ctx, history)

	return nil
}

func (s *service) Update(ctx context.Context, id string, updateData *models.EmergencyConstruction, userID string) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("emergency construction not found")
	}

	oldStatus := existing.Status

	// Update fields
	existing.Name = updateData.Name
	existing.Description = updateData.Description
	existing.Location = updateData.Location
	existing.StartDate = updateData.StartDate
	existing.EndDate = updateData.EndDate
	existing.Status = updateData.Status
	existing.Cost = updateData.Cost
	existing.OrgID = updateData.OrgID

	err = s.repo.Upsert(ctx, existing)
	if err != nil {
		return err
	}

	// Log history if status changed or just general update
	action := "update_info"
	if oldStatus != existing.Status {
		action = "update_status"
	}

	history := &models.EmergencyConstructionHistory{
		ConstructionID: id,
		Action:         action,
		OldStatus:      oldStatus,
		NewStatus:      existing.Status,
		UpdatedBy:      userID,
		Note:           "Updated emergency construction",
	}
	_ = s.historyRepo.Create(ctx, history)

	return nil
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *service) GetByID(ctx context.Context, id string) (*models.EmergencyConstruction, error) {
	item, err := s.repo.GetByID(ctx, id)
	if err == nil && item != nil && item.OrgID != "" {
		if org, errOrg := s.orgRepo.GetByID(ctx, item.OrgID); errOrg == nil && org != nil {
			item.OrganizationName = org.Name
		}
	}
	return item, err
}

func (s *service) List(ctx context.Context, f filter.Filter) ([]*models.EmergencyConstruction, int64, error) {
	items, total, err := s.repo.List(ctx, f)
	if err == nil {
		// Try resolving organization name
		for _, item := range items {
			if item.OrgID != "" {
				if org, errOrg := s.orgRepo.GetByID(ctx, item.OrgID); errOrg == nil && org != nil {
					item.OrganizationName = org.Name
				}
			}
		}
	}
	return items, total, err
}

func (s *service) ListHistory(ctx context.Context, f filter.Filter) ([]*models.EmergencyConstructionProgress, int64, error) {
	items, total, err := s.progressRepo.List(ctx, f)
	if err != nil {
		return nil, 0, err
	}

	// Try resolving construction name (Not perfectly optimized but will work)
	for _, item := range items {
		if cons, err := s.repo.GetByID(ctx, item.ConstructionID); err == nil && cons != nil {
			item.ConstructionName = cons.Name
		}
	}
	return items, total, nil
}

func (s *service) GetHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionHistory, error) {
	return s.historyRepo.ListByConstructionID(ctx, constructionID)
}

func (s *service) GetProgressByID(ctx context.Context, id string) (*models.EmergencyConstructionProgress, error) {
	return s.progressRepo.GetByID(ctx, id)
}

func (s *service) ReportProgress(ctx context.Context, progress *models.EmergencyConstructionProgress, images []ImageContent) error {
	return s.saveProgress(ctx, progress, images, true)
}

func (s *service) saveProgress(ctx context.Context, progress *models.EmergencyConstructionProgress, images []ImageContent, isNew bool) error {
	if progress.ProgressPercentage >= 100 || progress.IsCompleted {
		progress.IsCompleted = true
		progress.ProgressPercentage = 100
		if progress.ExpectedCompletionDate == 0 {
			progress.ExpectedCompletionDate = time.Now().Unix()
		}
	}

	if len(images) > 0 {
		u, err := s.userRepo.GetByID(ctx, progress.ReportedBy)
		if err == nil && u != nil && u.OrgID != "" {
			org, err := s.orgRepo.GetByID(ctx, u.OrgID)
			if err == nil && org != nil {
				folderID, err := s.resolveUploadFolder(ctx, org, "CONSTRUCTION", progress.ConstructionID)
				if err == nil {
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
							progress.Images = append(progress.Images, id)
						}
					}
				}
			}
		}
	}

	return s.progressRepo.Upsert(ctx, progress)
}

func (s *service) UpdateProgress(ctx context.Context, id string, progress *models.EmergencyConstructionProgress, images []ImageContent) error {
	existing, err := s.progressRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("progress report not found")
	}

	// Update fields
	existing.WorkDone = progress.WorkDone
	existing.Issues = progress.Issues
	existing.Order = progress.Order
	existing.Location = progress.Location

	if progress.ProgressPercentage >= 100 || progress.IsCompleted {
		progress.IsCompleted = true
		progress.ProgressPercentage = 100
		if progress.ExpectedCompletionDate == 0 {
			progress.ExpectedCompletionDate = time.Now().Unix()
		}
	}

	// 0.5 Upload images if any
	if len(images) > 0 {
		u, err := s.userRepo.GetByID(ctx, progress.ReportedBy)
		if err == nil && u != nil && u.OrgID != "" {
			org, err := s.orgRepo.GetByID(ctx, u.OrgID)
			if err == nil && org != nil {
				folderID, err := s.resolveUploadFolder(ctx, org, "CONSTRUCTION", progress.ConstructionID)
				if err == nil {
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
							progress.Images = append(progress.Images, id)
						}
					}
				}
			}
		}
	}

	// 1. Save progress report
	return s.progressRepo.Upsert(ctx, progress)
}

// Logic copied from inundation service to handle dynamic folders
func (s *service) resolveUploadFolder(ctx context.Context, org *models.Organization, dataType string, constructionID string) (string, error) {
	orgFolderID := org.DriveFolderID
	if orgFolderID == "" || orgFolderID == "." {
		newFolderID, err := s.driveSvc.CreateOrgFolder(ctx, org.Name)
		if err != nil {
			return "", err
		}
		orgFolderID = newFolderID
		org.DriveFolderID = newFolderID
		_ = s.orgRepo.Upsert(ctx, org)
	}

	// 1. Get/Create Type Folder (e.g., CONSTRUCTION)
	typeKey := fmt.Sprintf("type_%s_%s", orgFolderID, dataType)
	s.cacheMu.RLock()
	typeFolderID, ok := s.folderCache[typeKey]
	s.cacheMu.RUnlock()

	if !ok {
		var err error
		typeFolderID, err = s.driveSvc.FindOrCreateFolder(ctx, orgFolderID, dataType)
		if err != nil {
			return "", err
		}
		s.cacheMu.Lock()
		s.folderCache[typeKey] = typeFolderID
		s.cacheMu.Unlock()
	}

	if dataType == "REPORTS" {
		return typeFolderID, nil
	}

	// 2. Get/Create Construction Folder
	folderName := "UNKNOWN_CONSTRUCTION"
	if constructionID != "" {
		cons, err := s.repo.GetByID(ctx, constructionID)
		if err == nil && cons != nil {
			folderName = fmt.Sprintf("%s_%s", cons.Name, cons.ID)
		}
	}

	consKey := fmt.Sprintf("cons_%s_%s", typeFolderID, folderName)
	s.cacheMu.RLock()
	consFolderID, ok := s.folderCache[consKey]
	s.cacheMu.RUnlock()

	if !ok {
		var err error
		consFolderID, err = s.driveSvc.FindOrCreateFolder(ctx, typeFolderID, folderName)
		if err != nil {
			return "", err
		}
		s.cacheMu.Lock()
		s.folderCache[consKey] = consFolderID
		s.cacheMu.Unlock()
	}

	// 3. Get/Create Date Folder
	dateFolderName := time.Now().Format("2006-01-02")
	dateKey := fmt.Sprintf("date_%s_%s", consFolderID, dateFolderName)
	s.cacheMu.RLock()
	dateFolderID, ok := s.folderCache[dateKey]
	s.cacheMu.RUnlock()

	if !ok {
		var err error
		dateFolderID, err = s.driveSvc.FindOrCreateFolder(ctx, consFolderID, dateFolderName)
		if err != nil {
			return "", err
		}
		s.cacheMu.Lock()
		s.folderCache[dateKey] = dateFolderID
		s.cacheMu.Unlock()

		// Make the date folder public so files inside inherit the permission
		_ = s.driveSvc.SetPublic(ctx, dateFolderID)
	}

	return dateFolderID, nil
}

func (s *service) GetProgressHistory(ctx context.Context, constructionID string) ([]*models.EmergencyConstructionProgress, error) {
	items, err := s.progressRepo.ListByConstructionID(ctx, constructionID)
	if err == nil {
		if cons, errCons := s.repo.GetByID(ctx, constructionID); errCons == nil && cons != nil {
			for _, item := range items {
				item.ConstructionName = cons.Name
			}
		}
		sort.Slice(items, func(i, j int) bool {
			return items[i].ReportDate > items[j].ReportDate
		})
	}
	return items, err
}

func (s *service) ExportExcelToDrive(ctx context.Context, dateStr string, orgID string) (string, error) {
	// 1. Parse date
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	t, err := time.ParseInLocation("2006-01-02", dateStr, loc)
	if err != nil {
		return "", fmt.Errorf("invalid date format: %w", err)
	}
	startOfDay := t.Unix()
	endOfDay := t.Add(24*time.Hour).Unix() - 1

	// 2. Fetch Organizations
	orgs := []*models.Organization{}
	if orgID != "" {
		org, err := s.orgRepo.GetByID(ctx, orgID)
		if err != nil {
			return "", fmt.Errorf("organization not found: %w", err)
		}
		orgs = append(orgs, org)
	} else {
		// List all (basic simple list for now)
		items, _, err := s.orgRepo.List(ctx, filter.NewBasicFilter())
		if err != nil {
			return "", fmt.Errorf("failed to list organizations: %w", err)
		}
		orgs = items
	}

	// 3. Create Excel
	f := excelize.NewFile()
	sheetName := "Báo cáo ngày Tổng hợp lệnh"
	f.SetSheetName("Sheet1", sheetName)

	// Style headers
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#DCE6F1"}, Pattern: 1},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
	})
	contentStyle, _ := f.NewStyle(&excelize.Style{
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
		Alignment: &excelize.Alignment{Vertical: "center", WrapText: true},
	})

	// Row 0: Title
	f.MergeCell(sheetName, "A1", "H1")
	f.SetCellValue(sheetName, "A1", fmt.Sprintf("BẢNG TỔNG HỢP KẾT QUẢ TÌNH HÌNH TRIỂN KHAI CÁC LỆNH KHẨN CẤP NGÀY %s", dateStr))
	f.SetCellStyle(sheetName, "A1", "H1", titleStyle)
	f.SetRowHeight(sheetName, 1, 30)

	// Row 1: Headers
	headers := []string{"STT", "XÍ NGHIỆP", "CÁC LỆNH VÀ DỰ ÁN", "CÁC LỆNH", "VỊ TRÍ - TÌNH HÌNH TRIỂN KHAI", "ẢNH HƯỞNG", "ĐỀ XUẤT", "ẢNH"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 2)
		f.SetCellValue(sheetName, cell, h)
	}
	f.SetCellStyle(sheetName, "A2", "H2", headerStyle)
	f.SetRowHeight(sheetName, 2, 40)

	// Column Widths
	widths := map[string]float64{"A": 5, "B": 25, "C": 30, "D": 15, "E": 50, "F": 20, "G": 20, "H": 40}
	for col, width := range widths {
		f.SetColWidth(sheetName, col, col, width)
	}

	// 4. Fill Data
	rowIdx := 3
	stt := 1
	for _, org := range orgs {
		// Fetch constructions for this org
		consList, _, err := s.repo.List(ctx, filter.NewBasicFilter().AddWhere("org_id", "org_id", org.ID))
		if err != nil || len(consList) == 0 {
			continue
		}

		orgNameWritten := false
		for _, cons := range consList {
			// Fetch progress for this construction on this day
			progressList, _, err := s.progressRepo.List(ctx, filter.NewBasicFilter().
				AddWhere("construction_id", "construction_id", cons.ID).
				AddWhere("report_date", "report_date", bson.M{"$gte": startOfDay, "$lte": endOfDay}))

			if err != nil || len(progressList) == 0 {
				continue
			}

			for _, p := range progressList {
				f.SetCellValue(sheetName, fmt.Sprintf("A%d", rowIdx), stt)
				if !orgNameWritten {
					f.SetCellValue(sheetName, fmt.Sprintf("B%d", rowIdx), org.Name)
					orgNameWritten = true
				}
				f.SetCellValue(sheetName, fmt.Sprintf("C%d", rowIdx), cons.Name)
				f.SetCellValue(sheetName, fmt.Sprintf("D%d", rowIdx), p.Order)
				f.SetCellValue(sheetName, fmt.Sprintf("E%d", rowIdx), fmt.Sprintf("Vị trí: %s\nNội dung: %s", p.Location, p.WorkDone))
				f.SetCellValue(sheetName, fmt.Sprintf("F%d", rowIdx), p.Influence)
				f.SetCellValue(sheetName, fmt.Sprintf("G%d", rowIdx), p.Proposal)

				// Handle Images in parallel
				if len(p.Images) > 0 {
					g, gCtx := errgroup.WithContext(ctx)
					type imgResult struct {
						index int
						data  []byte
					}
					results := make([]imgResult, len(p.Images))

					for k, imgID := range p.Images {
						k, imgID := k, imgID
						g.Go(func() error {
							imgData, err := s.driveSvc.GetFileContent(gCtx, imgID)
							if err == nil {
								results[k] = imgResult{index: k, data: imgData}
							}
							return err
						})
					}

					if err := g.Wait(); err != nil {
						// Some images might fail, continue with others
					}

					for _, res := range results {
						if res.data == nil {
							continue
						}
						// Column H is index 8. Next images go to I, J, K...
						colIdx := 8 + res.index
						cellName, _ := excelize.CoordinatesToCellName(colIdx, rowIdx)

						// Set column width for image columns
						colName, _ := excelize.ColumnNumberToName(colIdx)
						_ = f.SetColWidth(sheetName, colName, colName, 25)

						_ = f.AddPictureFromBytes(sheetName, cellName, &excelize.Picture{
							Extension: ".jpg",
							File:      res.data,
							Format: &excelize.GraphicOptions{
								ScaleX:  0.15,
								ScaleY:  0.15,
								OffsetX: 5,
								OffsetY: 5,
							},
						})
					}
					f.SetRowHeight(sheetName, rowIdx, 100)
				} else {
					f.SetRowHeight(sheetName, rowIdx, 60)
				}

				f.SetCellStyle(sheetName, "A"+strconv.Itoa(rowIdx), "Z"+strconv.Itoa(rowIdx), contentStyle)
				rowIdx++
				stt++
			}
		}
	}

	// 5. Save to buffer and Upload to Drive
	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return "", fmt.Errorf("failed to write excel to buffer: %w", err)
	}
	_ = f.Close()

	// Determine target folder (REPORTS folder for the org, or a general one)
	// For now, let's use the first org's folder or a general one if not specified
	targetOrg := orgs[0]
	folderID, err := s.resolveUploadFolder(ctx, targetOrg, "REPORTS", "")
	if err != nil {
		return "", fmt.Errorf("failed to resolve report folder: %w", err)
	}

	fileName := fmt.Sprintf("BC_TH_Lenh_Khan_Cap_%s.xlsx", dateStr)
	// MIME type for .xlsx
	excelMime := "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	fileID, err := s.driveSvc.UploadFile(ctx, folderID, fileName, excelMime, &buf, false)
	if err != nil {
		return "", fmt.Errorf("failed to upload report to drive: %w", err)
	}

	// DEBUG: Save a local copy for verification
	localDebugPath := filepath.Join("uploads", fileName)
	_ = os.WriteFile(localDebugPath, buf.Bytes(), 0666)

	return fileID, nil
}
