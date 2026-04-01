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
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
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
	ExportProgressToExcel(ctx context.Context, progressID string) (string, error)
	GetUnfinishedProgressHistory(ctx context.Context) ([]*models.EmergencyConstructionProgress, error)
	TestExcelImageImport(ctx context.Context, driveLink string) (string, error)
	GetUserByID(ctx context.Context, id string) (*models.User, error)
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
		imageIDs, err := s.uploadImages(ctx, progress.ReportedBy, progress.ConstructionID, images)
		if err == nil {
			progress.Images = append(progress.Images, imageIDs...)
		}
	}

	return s.progressRepo.Upsert(ctx, progress)
}

func (s *service) uploadImages(ctx context.Context, userID string, constructionID string, images []ImageContent) ([]string, error) {
	u, err := s.userRepo.GetByID(ctx, userID)
	if err != nil || u == nil || u.OrgID == "" {
		return nil, errors.New("user or organization not found")
	}

	org, err := s.orgRepo.GetByID(ctx, u.OrgID)
	if err != nil || org == nil {
		return nil, errors.New("organization not found")
	}

	folderID, err := s.resolveUploadFolder(ctx, org, "CONSTRUCTION", constructionID)
	if err != nil {
		return nil, err
	}

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
		return nil, err
	}

	var result []string
	for _, id := range imageIDs {
		if id != "" {
			result = append(result, id)
		}
	}
	return result, nil
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
	existing.Influence = progress.Influence
	existing.Proposal = progress.Proposal

	if progress.ProgressPercentage >= 100 || progress.IsCompleted {
		existing.IsCompleted = true
		existing.ProgressPercentage = 100
		if existing.ExpectedCompletionDate == 0 {
			existing.ExpectedCompletionDate = time.Now().Unix()
		}
	} else {
		existing.ProgressPercentage = progress.ProgressPercentage
		existing.IsCompleted = false
	}

	// Upload images if any
	if len(images) > 0 {
		imageIDs, err := s.uploadImages(ctx, existing.ReportedBy, existing.ConstructionID, images)
		if err == nil {
			existing.Images = append(existing.Images, imageIDs...)
		}
	}

	// Save existing report
	return s.progressRepo.Upsert(ctx, existing)
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
	var startOfDay, endOfDay int64
	if dateStr != "" {
		t, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			return "", fmt.Errorf("invalid date format: %w", err)
		}
		startOfDay = t.Unix()
		endOfDay = t.Add(24 * time.Hour).Unix() - 1
	}

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
	title := fmt.Sprintf("BẢNG TỔNG HỢP KẾT QUẢ TÌNH HÌNH TRIỂN KHAI CÁC LỆNH KHẨN CẤP NGÀY %s", dateStr)
	if dateStr == "" {
		title = "BẢNG TỔNG HỢP KẾT QUẢ TÌNH HÌNH TRIỂN KHAI CÁC LỆNH KHẨN CẤP (TẤT CẢ CÔNG TRÌNH ĐANG THỰC HIỆN)"
	}
	f.SetCellValue(sheetName, "A1", title)
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
			// Skip completed constructions if no specific date is requested
			if dateStr == "" && cons.Status == "completed" {
				continue
			}

			// Fetch progress
			var progressList []*models.EmergencyConstructionProgress
			var err error

			if dateStr != "" {
				// Fetch progress for this construction on this specific day
				progressList, _, err = s.progressRepo.List(ctx, filter.NewBasicFilter().
					AddWhere("construction_id", "construction_id", cons.ID).
					AddWhere("report_date", "report_date", bson.M{"$gte": startOfDay, "$lte": endOfDay}))
			} else {
				// Fetch ALL history for this unfinished construction
				progressList, _, err = s.progressRepo.List(ctx, filter.NewBasicFilter().
					AddWhere("construction_id", "construction_id", cons.ID))
				// Sort history by date descending for better view in Excel if multiple entries
				sort.Slice(progressList, func(i, j int) bool {
					return progressList[i].ReportDate > progressList[j].ReportDate
				})
			}

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

				// Handle Images
				if len(p.Images) > 0 {
					// Apply style to potential image columns (up to 10 images for now)
					lastImgCol, _ := excelize.CoordinatesToCellName(8+len(p.Images)-1, rowIdx)
					f.SetCellStyle(sheetName, fmt.Sprintf("H%d", rowIdx), lastImgCol, contentStyle)

					fmt.Printf("DEBUG: Processing %d images for construction %s on row %d\n", len(p.Images), cons.Name, rowIdx)
					
					// Temporary directory for images
					tempDir := filepath.Join("uploads", "temp", fmt.Sprintf("%d", time.Now().UnixNano()))
					_ = os.MkdirAll(tempDir, 0755)
					defer os.RemoveAll(tempDir)

					g, gCtx := errgroup.WithContext(ctx)
					type imgResult struct {
						index int
						path  string
						id    string
					}
					results := make([]imgResult, len(p.Images))

					for k, imgID := range p.Images {
						k, imgID := k, imgID
						// Skip invalid IDs (IDs containing / are likely old API paths)
						if strings.Contains(imgID, "/") {
							continue
						}

						g.Go(func() error {
							imgData, err := s.driveSvc.GetFileContent(gCtx, imgID)
							if err == nil {
								ext := ".jpg"
								if len(imgData) > 4 && string(imgData[1:4]) == "PNG" {
									ext = ".png"
								}
								localPath := filepath.Join(tempDir, fmt.Sprintf("%s%s", imgID, ext))
								if err := os.WriteFile(localPath, imgData, 0644); err == nil {
									results[k] = imgResult{index: k, path: localPath, id: imgID}
								}
							} else {
								fmt.Printf("Error getting image %s from drive: %v\n", imgID, err)
							}
							return nil
						})
					}

					_ = g.Wait()

					for _, res := range results {
						if res.path == "" {
							continue
						}

						colIdx := 8 + res.index
						cellName, _ := excelize.CoordinatesToCellName(colIdx, rowIdx)
						colName, _ := excelize.ColumnNumberToName(colIdx)
						_ = f.SetColWidth(sheetName, colName, colName, 30)

						err := f.AddPicture(sheetName, cellName, res.path, &excelize.GraphicOptions{
							ScaleX:  0.10,
							ScaleY:  0.10,
							OffsetX: 10,
							OffsetY: 10,
						})
						if err != nil {
							fmt.Printf("Error adding picture %s to cell %s: %v\n", res.id, cellName, err)
						}

						// Add Hyperlink to the image cell
						driveLink := fmt.Sprintf("https://drive.google.com/open?id=%s", res.id)
						_ = f.SetCellHyperLink(sheetName, cellName, driveLink, "External")
					}
					f.SetRowHeight(sheetName, rowIdx, 120)
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
	if dateStr == "" {
		fileName = fmt.Sprintf("BC_Tong_Hop_Lenh_Khan_Cap_All_%s.xlsx", time.Now().Format("2006-01-02"))
	}
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

func (s *service) ExportProgressToExcel(ctx context.Context, progressID string) (string, error) {
	// 1. Get progress info
	progress, err := s.progressRepo.GetByID(ctx, progressID)
	if err != nil {
		return "", fmt.Errorf("failed to get progress info: %w", err)
	}

	// 2. Fetch images in parallel and save to temp
	tempDir := filepath.Join("uploads", "temp", fmt.Sprintf("progress_%s_%d", progressID, time.Now().UnixNano()))
	_ = os.MkdirAll(tempDir, 0755)
	defer os.RemoveAll(tempDir)

	g, gCtx := errgroup.WithContext(ctx)
	imagePaths := make([]string, len(progress.Images))
	for i, imgID := range progress.Images {
		i, imgID := i, imgID
		if strings.Contains(imgID, "/") {
			continue
		}
		g.Go(func() error {
			data, err := s.driveSvc.GetFileContent(gCtx, imgID)
			if err == nil {
				ext := ".jpg"
				if len(data) > 4 && string(data[1:4]) == "PNG" {
					ext = ".png"
				}
				localPath := filepath.Join(tempDir, fmt.Sprintf("%s%s", imgID, ext))
				if err := os.WriteFile(localPath, data, 0644); err == nil {
					imagePaths[i] = localPath
				}
			}
			return nil
		})
	}
	_ = g.Wait()

	// 3. Create Excel
	f := excelize.NewFile()
	sheetName := "Chi tiết báo cáo"
	f.SetSheetName("Sheet1", sheetName)

	f.SetCellValue(sheetName, "A1", "Thông tin chi tiết tiến độ công trình")
	f.SetCellValue(sheetName, "A2", "Công trình:")
	if cons, err := s.repo.GetByID(ctx, progress.ConstructionID); err == nil && cons != nil {
		f.SetCellValue(sheetName, "B2", cons.Name)
	}
	f.SetCellValue(sheetName, "A3", "Vị trí:")
	f.SetCellValue(sheetName, "B3", progress.Location)
	f.SetCellValue(sheetName, "A4", "Nội dung thực hiện:")
	f.SetCellValue(sheetName, "B4", progress.WorkDone)

	f.SetCellValue(sheetName, "H1", "ẢNH CHỤP TẠI HIỆN TRƯỜNG")

	for i, imgPath := range imagePaths {
		if imgPath == "" {
			continue
		}
		cell := fmt.Sprintf("H%d", i+2) // Chèn vào cột H, dòng tăng dần
		
		_ = f.AddPicture(sheetName, cell, imgPath, &excelize.GraphicOptions{
			ScaleX: 0.2,
			ScaleY: 0.2,
		})
		f.SetRowHeight(sheetName, i+2, 150)
		
		// Add Link
		if i < len(progress.Images) {
			driveLink := fmt.Sprintf("https://drive.google.com/open?id=%s", progress.Images[i])
			_ = f.SetCellHyperLink(sheetName, cell, driveLink, "External")
		}
	}
	f.SetColWidth(sheetName, "H", "H", 50)

	// 4. Save and Upload
	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return "", err
	}
	_ = f.Close()

	// Get user's org for folder resolution
	u, _ := s.userRepo.GetByID(ctx, progress.ReportedBy)
	org, _ := s.orgRepo.GetByID(ctx, u.OrgID)
	folderID, _ := s.resolveUploadFolder(ctx, org, "REPORTS", progress.ConstructionID)

	fileName := fmt.Sprintf("Detail_Progress_%s.xlsx", progressID)
	fileID, err := s.driveSvc.UploadFile(ctx, folderID, fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", &buf, false)
	
	return fileID, err
}

func (s *service) GetUnfinishedProgressHistory(ctx context.Context) ([]*models.EmergencyConstructionProgress, error) {
	// 1. Get all constructions that are NOT completed
	// We use a basic filter to get all, then filter by status if repo supports it or do it here
	f := filter.NewPaginationFilter()
	f.PerPage = 1000 // Get all logical amount
	f.AddWhere("status", "status", bson.M{"$ne": "completed"})
	
	constructions, _, err := s.repo.List(ctx, f)
	if err != nil {
		return nil, err
	}

	if len(constructions) == 0 {
		return []*models.EmergencyConstructionProgress{}, nil
	}

	ids := make([]string, len(constructions))
	consMap := make(map[string]*models.EmergencyConstruction)
	for i, c := range constructions {
		ids[i] = c.ID
		consMap[c.ID] = c
	}

	// 2. Get all progress for these IDs
	pf := filter.NewPaginationFilter()
	pf.PerPage = 5000 // Large enough to get history
	pf.AddWhere("construction_id", "construction_id", bson.M{"$in": ids})
	
	progressList, _, err := s.progressRepo.List(ctx, pf)
	if err != nil {
		return nil, err
	}

	// 3. Map construction names
	for _, p := range progressList {
		if c, ok := consMap[p.ConstructionID]; ok {
			p.ConstructionName = c.Name
		}
	}

	// Sort by date descending
	sort.Slice(progressList, func(i, j int) bool {
		return progressList[i].ReportDate > progressList[j].ReportDate
	})

	return progressList, nil
}

func (s *service) TestExcelImageImport(ctx context.Context, driveLink string) (string, error) {
	fileID := ExtractDriveFileID(driveLink)
	if fileID == "" {
		return "", errors.New("invalid google drive link")
	}

	content, err := s.driveSvc.GetFileContent(ctx, fileID)
	if err != nil {
		return "", fmt.Errorf("failed to get file content: %w", err)
	}

	return CreateExcelWithImage(content, fileID, driveLink)
}

func (s *service) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	return s.userRepo.GetByID(ctx, id)
}
