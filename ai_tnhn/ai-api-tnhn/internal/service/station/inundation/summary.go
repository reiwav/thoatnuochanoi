package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) GetInundationSummary(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string) (*InundationSummaryData, error) {
	dummyUser := &models.User{
		OrgID:                        orgID,
		AssignedInundationStationIDs: assignedInuIDs,
		IsEmployee:                   !isAllowedAll && len(assignedInuIDs) > 0,
	}

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	if loc == nil {
		loc = time.Local
	}
	t := time.Now().In(loc)
	startOfDay := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, loc).Unix()
	endOfDay := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, loc).Unix()

	f := filter.NewPaginationFilter()
	f.Page = 1
	f.PerPage = 1000

	f.AddWhere("ctime_filter", "created_at", bson.M{"$lte": endOfDay})
	f.AddWhere("has_flooded", "has_flooded", true)
	f.AddWhere("status_or_endtime", "$or", []bson.M{
		{"status": "active"},
		{"end_time": bson.M{"$gte": startOfDay}},
	})

	reports, _, err := s.ListReportsWithFilter(ctx, dummyUser, isAllowedAll, orgID, f)
	if err != nil {
		return nil, err
	}

	orgs, _ := s.orgRepo.GetAll(ctx)
	orgMap := make(map[string]string)
	for _, org := range orgs {
		orgMap[org.ID] = org.Name
	}

	var ongoing []InundationStationStat
	var detailStrings []string

	for _, r := range reports {
		streetName := r.StreetName
		if streetName == "" {
			point, err := s.inundationStationRepo.GetByID(ctx, r.PointID)
			if err == nil && point != nil {
				streetName = point.Name
			}
		}

		depthInfo := fmt.Sprintf("%v x %v x %.2f", r.Length, r.Width, r.Depth)
		if r.Length == "" && r.Width == "" && r.Depth == 0 {
			depthInfo = "chưa rõ độ sâu"
		} else {
			depthInfo = "ngập " + depthInfo
		}

		levelName := r.FloodLevelName
		if levelName == "" {
			levelName = "úng ngập"
		}

		statusText := fmt.Sprintf("Đang %s", levelName)
		if r.EndTime > 0 && r.EndTime <= endOfDay {
			statusText = fmt.Sprintf("Đã rút lúc %s", time.Unix(r.EndTime, 0).In(loc).Format("15:04"))
		}

		stat := InundationStationStat{
			PointID:        r.PointID,
			ReportID:       r.ID,
			StreetName:     streetName,
			OrgName:        orgMap[r.OrgID],
			Depth:          r.Depth,
			Width:          r.Width,
			Length:         r.Length,
			FormattedDepth: depthInfo,
			StartTime:      time.Unix(r.CTime, 0).In(loc).Format("15:04 02/01/2006"),
			Duration:       formatDuration(r.CTime, r.EndTime),
			Description:    r.Description,
			Color:          r.FloodLevelColor,
			CurrentStatus:  statusText,
			FloodLevelName: levelName,
		}
		ongoing = append(ongoing, stat)
		detailStrings = append(detailStrings, fmt.Sprintf("%s (%s, %s)", streetName, levelName, depthInfo))
	}

	sort.Slice(ongoing, func(i, j int) bool {
		return ongoing[i].StreetName < ongoing[j].StreetName
	})

	summaryText := "không xuất hiện điểm úng ngập"
	if len(ongoing) > 0 {
		summaryText = fmt.Sprintf("có %d điểm úng ngập", len(ongoing))
	}

	return &InundationSummaryData{
		ActivePoints:  len(ongoing),
		SummaryText:   summaryText,
		FullSummary:   strings.Join(detailStrings, ", "),
		OngoingPoints: ongoing,
	}, nil
}

func (s *service) GetInundationSummaryByDate(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string, dateStr string) (*InundationSummaryData, error) {
	// Parse the dateStr (format YYYY-MM-DD)
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		// Fallback to live inundation summary if parsing fails
		return s.GetInundationSummary(ctx, orgID, isAllowedAll, assignedInuIDs)
	}

	// Calculate start and end of that day (Unix timestamps in Vietnam local timezone)
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	if loc == nil {
		loc = time.Local
	}
	startOfDay := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, loc).Unix()
	endOfDay := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, loc).Unix()

	dummyUser := &models.User{
		OrgID:                        orgID,
		AssignedInundationStationIDs: assignedInuIDs,
		IsEmployee:                   !isAllowedAll && len(assignedInuIDs) > 0,
	}

	f := filter.NewPaginationFilter()
	f.Page = 1
	f.PerPage = 1000

	// Query MongoDB filters: active on the day
	f.AddWhere("ctime_filter", "created_at", bson.M{"$lte": endOfDay})
	f.AddWhere("has_flooded", "has_flooded", true)
	f.AddWhere("status_or_endtime", "$or", []bson.M{
		{"status": "active"},
		{"end_time": bson.M{"$gte": startOfDay}},
	})

	reports, _, err := s.ListReportsWithFilter(ctx, dummyUser, isAllowedAll, orgID, f)
	if err != nil {
		return nil, err
	}

	orgs, _ := s.orgRepo.GetAll(ctx)
	orgMap := make(map[string]string)
	for _, org := range orgs {
		orgMap[org.ID] = org.Name
	}

	var ongoing []InundationStationStat
	var detailStrings []string

	for _, r := range reports {
		streetName := r.StreetName
		if streetName == "" {
			point, err := s.inundationStationRepo.GetByID(ctx, r.PointID)
			if err == nil && point != nil {
				streetName = point.Name
			}
		}

		depthInfo := fmt.Sprintf("%v x %v x %.2f", r.Length, r.Width, r.Depth)
		if r.Length == "" && r.Width == "" && r.Depth == 0 {
			depthInfo = "chưa rõ độ sâu"
		} else {
			depthInfo = "ngập " + depthInfo
		}

		levelName := r.FloodLevelName
		if levelName == "" {
			levelName = "úng ngập"
		}

		statusText := fmt.Sprintf("Đang %s", levelName)
		if r.EndTime > 0 && r.EndTime <= endOfDay {
			statusText = fmt.Sprintf("Đã rút lúc %s", time.Unix(r.EndTime, 0).In(loc).Format("15:04"))
		}

		stat := InundationStationStat{
			PointID:        r.PointID,
			ReportID:       r.ID,
			StreetName:     streetName,
			OrgName:        orgMap[r.OrgID],
			Depth:          r.Depth,
			Width:          r.Width,
			Length:         r.Length,
			FormattedDepth: depthInfo,
			StartTime:      time.Unix(r.CTime, 0).In(loc).Format("15:04 02/01/2006"),
			Duration:       formatDuration(r.CTime, r.EndTime),
			Description:    r.Description,
			Color:          r.FloodLevelColor,
			CurrentStatus:  statusText,
			FloodLevelName: levelName,
		}
		ongoing = append(ongoing, stat)

		statusDetail := fmt.Sprintf("Đang %s", levelName)
		if r.EndTime > 0 && r.EndTime <= endOfDay {
			statusDetail = fmt.Sprintf("đã rút lúc %s", time.Unix(r.EndTime, 0).In(loc).Format("15:04"))
		}
		detailStrings = append(detailStrings, fmt.Sprintf("%s (%s, %s, %s)", streetName, levelName, depthInfo, statusDetail))
	}

	sort.Slice(ongoing, func(i, j int) bool {
		return ongoing[i].StreetName < ongoing[j].StreetName
	})

	// Format a readable Vietnamese date
	formattedDateStr := t.Format("02/01/2006")
	summaryText := fmt.Sprintf("ngày %s không xuất hiện điểm úng ngập", formattedDateStr)
	if len(ongoing) > 0 {
		summaryText = fmt.Sprintf("ngày %s có %d điểm úng ngập", formattedDateStr, len(ongoing))
	}

	return &InundationSummaryData{
		ActivePoints:  len(ongoing),
		SummaryText:   summaryText,
		FullSummary:   strings.Join(detailStrings, ", "),
		OngoingPoints: ongoing,
	}, nil
}

func formatDuration(cTime, endTime int64) string {
	if cTime <= 0 {
		return ""
	}
	var diff int64
	if endTime > 0 {
		diff = endTime - cTime
	} else {
		diff = time.Now().Unix() - cTime
	}
	if diff < 0 {
		diff = 0
	}

	hours := diff / 3600
	minutes := (diff % 3600) / 60
	days := hours / 24

	if days > 0 {
		remainingHours := hours % 24
		if remainingHours > 0 {
			return fmt.Sprintf("%d ngày %d giờ", days, remainingHours)
		}
		return fmt.Sprintf("%d ngày", days)
	}

	if hours > 0 {
		if minutes > 0 {
			return fmt.Sprintf("%d giờ %d phút", hours, minutes)
		}
		return fmt.Sprintf("%d giờ", hours)
	}

	if minutes > 0 {
		return fmt.Sprintf("%d phút", minutes)
	}
	return "0 phút"
}
