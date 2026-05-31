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
	"go.mongodb.org/mongo-driver/bson"
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

func (s *service) GetHistoryByDateRange(ctx context.Context, startDate, endDate, pointID string) ([]*models.InundationReport, error) {
	reports, err := s.InundationReportRepo.ListByDateRange(ctx, startDate, endDate, pointID)
	if err != nil {
		return nil, err
	}

	// Enrich reports with station names and org names (same as GetYearlyHistory)
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
				r.StreetName = point.Name
				r.Address = point.Address
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

		startTime := time.Unix(r.CTime, 0).Format("02/01/2006 15:04:05")
		f.SetCellValue(sheetName, "E"+strconv.Itoa(row), startTime)

		dimensions := fmt.Sprintf("%sx%sx%f", r.Length, r.Width, r.Depth)
		f.SetCellValue(sheetName, "F"+strconv.Itoa(row), dimensions)

		endTime := r.EndTime
		if endTime <= 0 {
			endTime = now
		}
		durationSeconds := endTime - r.CTime
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

func (s *service) GetPointHistory(ctx context.Context, pointID string, lastReportID string, size int) ([]*models.InundationHistory, int64, error) {
	if size <= 0 {
		size = 5
	}

	// Fallback: if pointID is actually a report ID, resolve it to the station/point ID
	if len(pointID) > 5 && pointID[:5] == "inrep" {
		report, err := s.InundationReportRepo.GetByID(ctx, pointID)
		if err == nil && report != nil && report.PointID != "" {
			pointID = report.PointID
		}
	}

	station, err := s.inundationStationRepo.GetByID(ctx, pointID)
	if err != nil || station == nil {
		return []*models.InundationHistory{}, 0, nil
	}

	rf := filter.NewPaginationFilter()
	rf.AddWhere("inundation_id", "inundation_id", pointID)
	rf.SetOrderBy("-created_at")
	rf.PerPage = int64(size)

	if lastReportID != "" {
		lastHistory, err := s.inundationHistoryRepo.GetByID(ctx, lastReportID)
		if err == nil && lastHistory != nil {
			rf.AddWhere("created_at_lt", "created_at", bson.M{"$lt": lastHistory.CTime})
		}
	}

	histories, _, err := s.inundationHistoryRepo.List(ctx, rf)
	if err != nil {
		return nil, 0, err
	}

	countFilter := filter.NewPaginationFilter()
	countFilter.AddWhere("inundation_id", "inundation_id", pointID)
	_, total, err := s.inundationHistoryRepo.List(ctx, countFilter)
	if err != nil {
		total = int64(len(histories))
	}

	return histories, total, nil
}
