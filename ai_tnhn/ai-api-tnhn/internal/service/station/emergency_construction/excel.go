package emergency_construction

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/sync/errgroup"
)

func (s *service) ExportExcelToDrive(ctx context.Context, dateStr string, orgID string) (string, error) {
	// 1. Parse date
	var startOfDay, endOfDay int64
	if dateStr != "" {
		t, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			return "", fmt.Errorf("invalid date format: %w", err)
		}
		startOfDay = t.Unix()
		endOfDay = t.Add(24*time.Hour).Unix() - 1
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
		// Fetch constructions for this org (Union of owned and shared)
		filterReq := filter.NewBasicFilter()
		filterReq.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": org.ID},
			{"shared_org_ids": org.ID},
		})
		consList, _, err := s.repo.List(ctx, filterReq)
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
				// Sort history by date descending
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

	// Determine target folder
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

	// Internal copy
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

	// 2. Fetch images in parallel
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
		cell := fmt.Sprintf("H%d", i+2)

		_ = f.AddPicture(sheetName, cell, imgPath, &excelize.GraphicOptions{
			ScaleX: 0.2,
			ScaleY: 0.2,
		})
		f.SetRowHeight(sheetName, i+2, 150)

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

	u, _ := s.userRepo.GetByID(ctx, progress.ReportedBy)
	org, _ := s.orgRepo.GetByID(ctx, u.OrgID)
	folderID, _ := s.resolveUploadFolder(ctx, org, "REPORTS", progress.ConstructionID)

	fileName := fmt.Sprintf("Detail_Progress_%s.xlsx", progressID)
	fileID, err := s.driveSvc.UploadFile(ctx, folderID, fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", &buf, false)

	return fileID, err
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
