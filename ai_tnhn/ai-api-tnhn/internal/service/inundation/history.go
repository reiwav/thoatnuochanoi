package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"time"

	"os"
	"path/filepath"
	"strconv"

	"github.com/xuri/excelize/v2"
)

func (s *service) GetYearlyHistory(ctx context.Context, orgID string, year int) ([]*models.InundationReport, error) {
	reports, err := s.InundationReportRepo.ListByYear(ctx, orgID, year)
	if err != nil {
		return nil, err
	}

	// Enrich reports with station names and org names
	orgs, _, _ := s.orgRepo.List(ctx, filter.NewPaginationFilter())
	orgNameMap := make(map[string]string)
	orgCodeMap := make(map[string]string)
	for _, o := range orgs {
		orgNameMap[o.ID] = o.Name
		orgCodeMap[o.ID] = o.Code
	}

	for _, r := range reports {
		r.OrgName = orgNameMap[r.OrgID]
		r.OrgCode = orgCodeMap[r.OrgID]
		if r.PointID != "" {
			point, _ := s.inundationStationRepo.GetByID(ctx, r.PointID)
			if point != nil {
				r.StreetName = point.Name // Use the station name if available
				r.Address = point.Address
				// Populate Org info from point if report org is empty
				if r.OrgID == "" {
					r.OrgID = point.OrgID
					r.OrgName = orgNameMap[point.OrgID]
					r.OrgCode = orgCodeMap[point.OrgID]
				}
			}
		}
	}

	return reports, nil
}
func (s *service) ExportYearlyHistory(ctx context.Context, orgID string, year int) (string, error) {
	reports, err := s.GetYearlyHistory(ctx, orgID, year)
	if err != nil {
		return "", err
	}

	f := excelize.NewFile()
	sheetName := "LichSuNgap"
	index, _ := f.NewSheet(sheetName)
	f.DeleteSheet("Sheet1")

	// Calculate counts per point
	pointCounts := make(map[string]int)
	for _, r := range reports {
		id := r.PointID
		if id == "" {
			id = r.StreetName
		}
		pointCounts[id]++
	}

	// Set Headers
	headers := []string{"STT", "Điểm ngập lụt", "Đơn vị", "Quận", "Bắt đầu ngập", "Kích thước (DxRxS)", "Thời gian ngập (phút)", "Số lần ngập trong năm"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// Helper to format duration
	formatDuration := func(seconds int64) string {
		if seconds <= 0 {
			return "0ph"
		}
		h := seconds / 3600
		m := (seconds % 3600) / 60
		if h > 0 {
			return fmt.Sprintf("%dh %dph", h, m)
		}
		return fmt.Sprintf("%dph", m)
	}

	now := time.Now().Unix()
	for i, r := range reports {
		row := i + 2
		f.SetCellValue(sheetName, "A"+strconv.Itoa(row), i+1)
		f.SetCellValue(sheetName, "B"+strconv.Itoa(row), r.StreetName)
		f.SetCellValue(sheetName, "C"+strconv.Itoa(row), r.OrgCode)
		f.SetCellValue(sheetName, "D"+strconv.Itoa(row), r.Address)

		startTime := time.Unix(r.StartTime, 0).Format("02/01/2006 15:04:05")
		f.SetCellValue(sheetName, "E"+strconv.Itoa(row), startTime)

		dimensions := fmt.Sprintf("%sx%sx%f", r.Length, r.Width, r.Depth)
		f.SetCellValue(sheetName, "F"+strconv.Itoa(row), dimensions)

		endTime := r.EndTime
		if endTime <= 0 {
			endTime = now
		}
		durationSeconds := endTime - r.StartTime
		f.SetCellValue(sheetName, "G"+strconv.Itoa(row), formatDuration(durationSeconds))

		id := r.PointID
		if id == "" {
			id = r.StreetName
		}
		f.SetCellValue(sheetName, "H"+strconv.Itoa(row), pointCounts[id])
	}

	f.SetActiveSheet(index)

	// Save to temp file
	baseDir := "uploads/exports"
	if _, err := os.Stat(baseDir); os.IsNotExist(err) {
		_ = os.MkdirAll(baseDir, 0755)
	}
	fileName := fmt.Sprintf("lich_su_ngap_%d_%d.xlsx", year, time.Now().Unix())
	filePath := filepath.Join(baseDir, fileName)

	if err := f.SaveAs(filePath); err != nil {
		return "", err
	}

	return filePath, nil
}
