package gemini

// Inundation tool handlers: the live/by-date summary with optional org filter,
// and the historical range query that groups repeat floods per location.

import (
	"context"
	"fmt"
	"strings"
	"time"

	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/service/station/inundation"
	"ai-api-tnhn/utils"

	"go.mongodb.org/mongo-driver/bson"
)

// timeLayoutDisplay is how inundation timestamps are shown to users.
const timeLayoutDisplay = "15:04 02/01/2006"

// handleInundationSummary returns the current inundation picture, or that of a
// specific day, narrowed to the caller's scope.
func (s *service) handleInundationSummary(ctx context.Context, args map[string]interface{}, scope dataScope) (interface{}, error) {
	dateVal, _ := args["date"].(string)

	var summary *inundation.InundationSummaryData
	var err error
	if dateVal != "" {
		summary, err = s.inuSvc.GetInundationSummaryByDate(ctx, scope.OrgID, scope.IsAllowedAll, scope.InundationIDs, dateVal)
	} else {
		summary, err = s.inuSvc.GetInundationSummary(ctx, scope.OrgID, scope.IsAllowedAll, scope.InundationIDs)
	}
	if err != nil {
		return nil, err
	}

	if orgName, _ := args["org_name"].(string); orgName != "" {
		filterSummaryByOrg(summary, orgName, dateVal)
	}
	return summary, nil
}

// filterSummaryByOrg narrows an already-fetched summary to one managing unit and
// rewrites the derived counts and prose to match.
//
// This filters after the fact rather than in the query because the caller names
// the unit in free text ("Xí nghiệp 2", "Xí nghiệp thoát nước số 2") and the
// match has to be fuzzy.
func filterSummaryByOrg(summary *inundation.InundationSummaryData, orgName, dateVal string) {
	orgNameLower := strings.ToLower(orgName)

	var filtered []inundation.InundationStationStat
	var details []string
	for _, pt := range summary.OngoingPoints {
		if matchesOrg(strings.ToLower(pt.OrgName), orgNameLower) {
			filtered = append(filtered, pt)
			details = append(details, fmt.Sprintf("%s (%s, %s)", pt.StreetName, pt.FloodLevelName, pt.FormattedDepth))
		}
	}

	summary.OngoingPoints = filtered
	summary.ActivePoints = len(filtered)
	summary.FullSummary = strings.Join(details, ", ")

	when := "hiện tại"
	if dateVal != "" {
		when = "ngày " + dateVal
	}
	if len(filtered) > 0 {
		summary.SummaryText = fmt.Sprintf("%s, đơn vị %s có %d điểm úng ngập", when, orgName, len(filtered))
	} else {
		summary.SummaryText = fmt.Sprintf("%s, đơn vị %s không xuất hiện điểm úng ngập", when, orgName)
	}
}

// handleInundationHistoryByRange counts how often each location flooded between
// two dates, optionally for one managing unit.
func (s *service) handleInundationHistoryByRange(ctx context.Context, startDateStr, endDateStr, orgNameFilter string) (interface{}, error) {
	tStart, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		return nil, fmt.Errorf("ngày bắt đầu không hợp lệ (định dạng đúng: YYYY-MM-DD)")
	}
	tEnd, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		return nil, fmt.Errorf("ngày kết thúc không hợp lệ (định dạng đúng: YYYY-MM-DD)")
	}

	startOfDay := time.Date(tStart.Year(), tStart.Month(), tStart.Day(), 0, 0, 0, 0, utils.VietnamLocation).Unix()
	endOfDay := time.Date(tEnd.Year(), tEnd.Month(), tEnd.Day(), 23, 59, 59, 999999999, utils.VietnamLocation).Unix()

	filterVal := bson.M{
		"has_flooded": true,
		"created_at": bson.M{
			"$gte": startOfDay,
			"$lte": endOfDay,
		},
	}

	reports, err := s.querySvc.Query(ctx, constant.CollInundationReports, filterVal, 0)
	if err != nil {
		return nil, fmt.Errorf("lỗi khi truy vấn CSDL: %w", err)
	}

	orgMap := s.organizationNames(ctx)
	groups := groupInundationReports(reports)

	orgNameFilterLower := strings.ToLower(orgNameFilter)
	formattedList := make([]map[string]interface{}, 0)
	for _, g := range groups {
		orgName := orgMap[g.orgID]
		if orgName == "" {
			orgName = g.orgID
		}
		if orgNameFilterLower != "" && !matchesOrg(strings.ToLower(orgName), orgNameFilterLower) {
			continue
		}
		formattedList = append(formattedList, renderInundationGroup(g, orgName, startDateStr, endDateStr))
	}
	return formattedList, nil
}

// organizationNames builds an org id -> display name lookup.
func (s *service) organizationNames(ctx context.Context) map[string]string {
	orgMap := make(map[string]string)
	// TODO(B7): limit 0 is clamped to 100 by the query service, so an
	// installation with more than 100 organisations resolves only the first 100
	// names and the rest render as raw ids.
	orgs, err := s.querySvc.Query(ctx, constant.CollOrganizations, nil, 0)
	if err != nil {
		return orgMap
	}
	for _, org := range orgs {
		id, _ := org["_id"].(string)
		name, _ := org["name"].(string)
		if id != "" && name != "" {
			orgMap[id] = name
		}
	}
	return orgMap
}

// reportGroup accumulates every report filed against one location.
type reportGroup struct {
	pointID        string
	streetName     string
	orgID          string
	color          string
	levelName      string
	maxDepth       float64
	count          int
	mostRecentTime int64
	hasActive      bool
}

// groupInundationReports collapses raw report documents into one entry per
// location, preserving first-seen order.
//
// Reports are keyed by point id, falling back to street name for legacy rows
// that predate point ids. Fields are read from an untyped map because the
// depth and flood-level values live on embedded structs tagged bson:"-" in
// models.InundationReport and so are absent from the typed struct.
func groupInundationReports(reports []map[string]interface{}) []*reportGroup {
	groups := make([]*reportGroup, 0)
	byKey := make(map[string]*reportGroup)

	for _, doc := range reports {
		pointID, _ := doc["point_id"].(string)
		streetName, _ := doc["street_name"].(string)
		orgID, _ := doc["org_id"].(string)

		key := pointID
		if key == "" {
			key = streetName
		}

		g, ok := byKey[key]
		if !ok {
			g = &reportGroup{pointID: pointID, streetName: streetName, orgID: orgID}
			byKey[key] = g
			groups = append(groups, g)
		}

		g.count++

		if depth := getFloat64Value(doc["depth"]); depth > g.maxDepth {
			g.maxDepth = depth
		}
		// Last non-empty value wins, so a location keeps its most recently
		// reported severity even if later reports omit it.
		if color, _ := doc["flood_level_color"].(string); color != "" {
			g.color = color
		}
		if levelName, _ := doc["flood_level_name"].(string); levelName != "" {
			g.levelName = levelName
		}
		if status, _ := doc["status"].(string); status == "active" {
			g.hasActive = true
		}
		if cTime := getInt64Value(doc["created_at"]); cTime > g.mostRecentTime {
			g.mostRecentTime = cTime
		}
	}
	return groups
}

// renderInundationGroup turns one grouped location into the frontend payload.
//
// "duration" carries an occurrence count rather than an elapsed time: over a
// date range the useful figure is how many times a location flooded.
func renderInundationGroup(g *reportGroup, orgName, startDate, endDate string) map[string]interface{} {
	doc := map[string]interface{}{
		"point_id":         g.pointID,
		"street_name":      g.streetName,
		"org_name":         orgName,
		"count":            g.count,
		"query_start_date": startDate,
		"query_end_date":   endDate,
		"duration":         fmt.Sprintf("%d lần", g.count),
	}

	if g.mostRecentTime > 0 {
		doc["start_time"] = time.Unix(g.mostRecentTime, 0).In(utils.VietnamLocation).Format(timeLayoutDisplay)
	}

	if g.hasActive {
		doc["current_status"] = fmt.Sprintf("Đang ngập (%d lần)", g.count)
	} else {
		doc["current_status"] = fmt.Sprintf("Đã rút (%d lần)", g.count)
	}

	if g.maxDepth > 0 {
		doc["formatted_depth"] = fmt.Sprintf("Max: %.2fm", g.maxDepth)
	} else {
		doc["formatted_depth"] = "chưa rõ độ sâu"
	}

	if g.color != "" {
		doc["color"] = g.color
	}
	return doc
}

// matchesOrg fuzzily matches a managing-unit name against a user's phrasing.
//
// Callers say "Xí nghiệp 2", "XN2" or "Xí nghiệp thoát nước số 2" for the same
// unit, so both sides are reduced to a canonical form before comparing, and a
// match in either direction counts.
func matchesOrg(target, query string) bool {
	if strings.Contains(target, query) {
		return true
	}

	simplify := func(s string) string {
		s = strings.ToLower(s)
		s = strings.ReplaceAll(s, "xí nghiệp", "xn")
		s = strings.ReplaceAll(s, "thoát nước", "")
		s = strings.ReplaceAll(s, "số", "")
		s = strings.ReplaceAll(s, " ", "")
		return s
	}

	return strings.Contains(simplify(target), simplify(query)) || strings.Contains(simplify(query), simplify(target))
}
