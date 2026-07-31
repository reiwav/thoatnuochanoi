package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"strings"
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

	// Set Headers
	headers := []string{"STT", "Điểm ngập lụt", "Đơn vị", "Địa chỉ", "Đợt ngập (Bắt đầu - Kết thúc)", "Thời gian cập nhật", "Người cập nhật", "Kích thước (DxRxS)", "Cấp độ ngập", "Tình trạng giao thông", "Ghi chú"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// Create a style for vertically centering text in merged cells
	centerStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{
			Vertical: "center",
		},
	})

	// Helper to format dimensions
	formatDim := func(val string) string {
		val = strings.ToLower(val)
		val = strings.ReplaceAll(val, "m", "")
		return strings.TrimSpace(val)
	}

	// Group reports by Station
	type StationEvents struct {
		PointID    string
		StreetName string
		OrgName    string
		Address    string
		Events     []*models.InundationReport
	}

	var stationOrder []string
	stationMap := make(map[string]*StationEvents)
	var reportIDs []string

	for _, r := range reports {
		id := r.PointID
		if id == "" {
			id = r.StreetName
		}
		if _, exists := stationMap[id]; !exists {
			stationMap[id] = &StationEvents{
				PointID:    id,
				StreetName: r.StreetName,
				OrgName:    r.OrgName,
				Address:    r.Address,
			}
			stationOrder = append(stationOrder, id)
		}
		stationMap[id].Events = append(stationMap[id].Events, r)
		reportIDs = append(reportIDs, r.ID)
	}

	// Bulk fetch histories to avoid N+1 query problem
	historyMap := make(map[string][]*models.InundationHistory)
	if len(reportIDs) > 0 {
		f := filter.NewPaginationFilter()
		f.PerPage = 10000 // Get all histories in one go
		f.AddWhere("inundation_or_report_id", "$or", []bson.M{
			{"inundation_id": bson.M{"$in": reportIDs}},
			{"report_id": bson.M{"$in": reportIDs}},
		})
		f.SetOrderBy("created_at")

		allHistories, _, err := s.inundationHistoryRepo.List(ctx, f)
		if err == nil {
			for _, h := range allHistories {
				id := h.ReportId
				if id == "" {
					id = h.InundationId
				}
				historyMap[id] = append(historyMap[id], h)
			}
		}
	}

	rowIdx := 2
	stt := 1
	for _, stationID := range stationOrder {
		station := stationMap[stationID]
		stationStartRow := rowIdx
		hasAnyHistory := false

		for _, r := range station.Events {
			// Fetch histories for this report from the map
			histories := historyMap[r.ID]
			if len(histories) == 0 {
				continue // Skip this report if no histories
			}
			hasAnyHistory = true

			eventStartRow := rowIdx
			for _, h := range histories {
				f.SetCellValue(sheetName, "A"+strconv.Itoa(rowIdx), stt)
				f.SetCellValue(sheetName, "B"+strconv.Itoa(rowIdx), station.StreetName)

				orgName := h.OrgName
				if orgName == "" {
					orgName = station.OrgName
				}
				f.SetCellValue(sheetName, "C"+strconv.Itoa(rowIdx), orgName)
				f.SetCellValue(sheetName, "D"+strconv.Itoa(rowIdx), station.Address)

				eventStartTime := time.Unix(r.CTime, 0).Format("02/01/2006")
				eventEndTime := "Đang ngập"
				if r.EndTime > 0 {
					eventEndTime = time.Unix(r.EndTime, 0).Format("02/01/2006")
				}
				f.SetCellValue(sheetName, "E"+strconv.Itoa(rowIdx), fmt.Sprintf("%s - %s", eventStartTime, eventEndTime))

				updateTime := time.Unix(h.CTime, 0).Format("02/01/2006 15:04:05")
				f.SetCellValue(sheetName, "F"+strconv.Itoa(rowIdx), updateTime)

				f.SetCellValue(sheetName, "G"+strconv.Itoa(rowIdx), h.UserName)
				f.SetCellValue(sheetName, "H"+strconv.Itoa(rowIdx), fmt.Sprintf("%sx%sx%v", formatDim(h.Length), formatDim(h.Width), h.Depth))
				f.SetCellValue(sheetName, "I"+strconv.Itoa(rowIdx), h.FloodLevelName)
				f.SetCellValue(sheetName, "J"+strconv.Itoa(rowIdx), h.TrafficStatus)
				f.SetCellValue(sheetName, "K"+strconv.Itoa(rowIdx), h.Note)

				rowIdx++
			}

			eventEndRow := rowIdx - 1
			if eventEndRow > eventStartRow {
				// Merge Event-specific column (E: Thời gian bắt đầu đợt ngập)
				f.MergeCell(sheetName, "E"+strconv.Itoa(eventStartRow), "E"+strconv.Itoa(eventEndRow))
				f.SetCellStyle(sheetName, "E"+strconv.Itoa(eventStartRow), "E"+strconv.Itoa(eventEndRow), centerStyle)
			}
		}

		if hasAnyHistory {
			stationEndRow := rowIdx - 1
			if stationEndRow > stationStartRow {
				// Merge Station-specific columns (A, B, C, D)
				colsToMerge := []string{"A", "B", "C", "D"}
				for _, col := range colsToMerge {
					f.MergeCell(sheetName, col+strconv.Itoa(stationStartRow), col+strconv.Itoa(stationEndRow))
				}
				f.SetCellStyle(sheetName, "A"+strconv.Itoa(stationStartRow), "D"+strconv.Itoa(stationEndRow), centerStyle)
			}
			stt++
		}
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

func (s *service) GetReportHistory(ctx context.Context, reportID string) ([]*models.InundationHistory, int64, error) {
	rf := filter.NewPaginationFilter()
	rf.AddWhere("report_id", "report_id", reportID)
	rf.SetOrderBy("-created_at")
	rf.PerPage = 100 // Lấy tối đa 100 lịch sử của một report để đảm bảo lấy hết mà không cần phân trang

	histories, _, err := s.inundationHistoryRepo.List(ctx, rf)
	if err != nil {
		return nil, 0, err
	}

	total := int64(len(histories))
	return histories, total, nil
}
