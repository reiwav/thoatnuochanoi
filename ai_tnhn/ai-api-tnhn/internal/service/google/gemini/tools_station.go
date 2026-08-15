package gemini

// Station-listing and rain-analytics tool handlers.

import (
	"context"
	"fmt"
	"log"
	"time"

	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/utils"

	"github.com/google/generative-ai-go/genai"
)

// isCurrentRainDay reports whether date falls in the active rain-day cycle.
// A rain day D runs 07:00 D to 07:00 D+1, so before 7AM the current rain day is
// yesterday. Both the rain day and today's calendar date are accepted.
func (s *service) isCurrentRainDay(date string) bool {
	currentRainDay := utils.CurrentRainDate()
	today := utils.TodayVietnam()
	return date == currentRainDay || date == today
}

// handleListStations routes the list_stations tool to a per-type handler.
func (s *service) handleListStations(ctx context.Context, c *genai.FunctionCall, scope dataScope) (interface{}, error) {
	stationType := c.Args["type"].(string)
	log.Printf("[handleListStations] type=%s, args=%v", stationType, c.Args)

	switch stationType {
	case "rain":
		return s.handleListRainStations(ctx, c, scope)
	case "lake":
		return s.handleListLakeStations(ctx, scope)
	case "river":
		return s.handleListRiverStations(ctx, scope)
	case "inundation":
		return s.handleListInundationPoints(ctx, c)
	}
	return nil, fmt.Errorf("invalid type")
}

// handleListRainStations lists rain stations, optionally with the rainfall
// recorded on a given date (and optionally up to a given time on that date).
//
// Three sources are possible, in order of preference:
//  1. no date at all -> the bare station list;
//  2. a date inside the current rain day with no time -> the live summary,
//     which is fresher than the persisted records;
//  3. otherwise -> the persisted records for that rain day.
func (s *service) handleListRainStations(ctx context.Context, c *genai.FunctionCall, scope dataScope) (interface{}, error) {
	dateArg, _ := c.Args["date"].(string)
	if dateArg == "" {
		return s.listRainStationsPlain(ctx, scope, dateArg)
	}

	// A specific time narrows the query to readings at or before that instant,
	// and also decides which rain day the instant belongs to.
	rainDay := dateArg
	var targetTime time.Time
	var hasTime bool
	if timeArg, ok := c.Args["time"].(string); ok && timeArg != "" {
		if parsed, err := utils.ParseVietnamTime(dateArg + " " + timeArg); err == nil {
			targetTime = parsed
			hasTime = true
			rainDay = utils.GetRainDate(parsed)
		}
	}

	displayDate := rainDay
	if hasTime {
		displayDate = targetTime.Format("2006-01-02 15:04:05")
	}

	// Live path: today's totals, only the stations that actually saw rain.
	if !hasTime && s.isCurrentRainDay(rainDay) {
		if summary, err := s.weatherSvc.GetRainSummary(ctx, scope.OrgID, scope.RainIDs); err == nil && summary != nil {
			var res []googleapi.RainTableRow
			for i, m := range summary.Measurements {
				if m.TotalRain > 0 {
					res = append(res, googleapi.NewRainTableRow(i+1, m.ID, m.OldID, m.Name, m.Address, m.Type, m.Priority, m.TotalRain, m.IsRaining, m.StartTime, m.EndTime, rainDay))
				}
			}
			log.Printf("[handleListRainStations] live rain: returning %d stations", len(res))
			return res, nil
		}
	}

	// Historical path.
	stations, stationErr := s.stationSvc.ListRainStationsFiltered(ctx, scope.OrgID, scope.RainIDs)
	records, err := s.rainSvc.GetRainDataByDate(ctx, rainDay)

	if err == nil && hasTime {
		var filtered []*models.RainRecord
		for _, rec := range records {
			if !utils.ToVietnam(rec.Timestamp).After(targetTime) {
				filtered = append(filtered, rec)
			}
		}
		records = filtered
	}

	log.Printf("[handleListRainStations] historical: stations=%d, filtered_records=%d, err=%v", len(stations), len(records), err)
	if err == nil && len(records) > 0 {
		totals := maxRainPerStation(records)

		var res []googleapi.RainTableRow
		for _, st := range stations {
			total, ok := totals[st.OldID]
			if !ok || total <= 0 {
				continue
			}
			// TODO(B6): built by hand rather than via NewRainTableRow, so STT,
			// "Thời gian" and "Trạng thái" come back empty for historical rows.
			res = append(res, googleapi.RainTableRow{
				ID:        st.ID,
				OldID:     st.OldID,
				Tram:      st.TenTram,
				DiaChi:    st.DiaChi,
				LuongMua:  fmt.Sprintf("%.1f", total),
				Type:      string(st.Loai),
				TotalRain: total,
				IsRaining: false,
				Date:      displayDate,
			})
		}
		return res, nil
	}

	// No records for that day: still return the station list so the model can
	// say "these stations exist but recorded nothing".
	var res []googleapi.RainTableRow
	for _, st := range stations {
		// TODO(B6): see above.
		res = append(res, googleapi.RainTableRow{
			ID:     st.ID,
			OldID:  st.OldID,
			Tram:   st.TenTram,
			DiaChi: st.DiaChi,
			Date:   displayDate,
		})
	}
	return res, stationErr
}

// listRainStationsPlain returns the station list with no rainfall attached.
func (s *service) listRainStationsPlain(ctx context.Context, scope dataScope, date string) (interface{}, error) {
	stations, err := s.stationSvc.ListRainStationsFiltered(ctx, scope.OrgID, scope.RainIDs)
	var res []googleapi.RainTableRow
	for _, st := range stations {
		// TODO(B6): see handleListRainStations.
		res = append(res, googleapi.RainTableRow{
			ID:     st.ID,
			OldID:  st.OldID,
			Tram:   st.TenTram,
			DiaChi: st.DiaChi,
			Date:   date,
		})
	}
	return res, err
}

// maxRainPerStation reduces raw records to one figure per station.
//
// The gauge reports a cumulative daily total, so the largest reading in the
// window is the total for that window rather than the sum.
func maxRainPerStation(records []*models.RainRecord) map[int]float64 {
	totals := make(map[int]float64)
	for _, rec := range records {
		sid := int(rec.StationID)
		if rec.Value > totals[sid] {
			totals[sid] = rec.Value
		}
	}
	return totals
}

// handleListLakeStations lists lake stations visible to the caller.
func (s *service) handleListLakeStations(ctx context.Context, scope dataScope) (interface{}, error) {
	stations, err := s.stationSvc.ListLakeStationsFiltered(ctx, scope.OrgID, scope.LakeIDs)
	var res []map[string]interface{}
	for _, st := range stations {
		// Loai here is a plain string ("lake"/"river"), unlike RainStation.Loai
		// which is a StationAreaType ("phuong"/"xa"), so it is passed through raw.
		res = append(res, map[string]interface{}{"id": st.ID, "old_id": st.OldID, "name": st.TenTram, "phuong": st.TenPhuong, "loai": st.Loai})
	}
	return res, err
}

// handleListRiverStations lists river stations visible to the caller.
func (s *service) handleListRiverStations(ctx context.Context, scope dataScope) (interface{}, error) {
	stations, err := s.stationSvc.ListRiverStationsFiltered(ctx, scope.OrgID, scope.RiverIDs)
	var res []map[string]interface{}
	for _, st := range stations {
		res = append(res, map[string]interface{}{"id": st.ID, "old_id": st.OldID, "name": st.TenTram, "phuong": st.TenPhuong, "loai": st.Loai})
	}
	return res, err
}

// handleListInundationPoints lists inundation points, optionally filtered by
// status.
//
// The "field_checked" filter is special: instead of matching a status value it
// keeps points whose latest report was filed today, then relabels the status to
// say so.
func (s *service) handleListInundationPoints(ctx context.Context, c *genai.FunctionCall) (interface{}, error) {
	points, err := s.inuSvc.GetPointsStatus(ctx, &models.User{}, true, "")
	if err != nil {
		return nil, err
	}

	filterStatus, _ := c.Args["status"].(string)
	var res []map[string]interface{}
	for _, st := range points {
		if filterStatus == "field_checked" {
			if !reportedToday(st.LastReport) {
				continue
			}
		} else if filterStatus != "" && st.Status != filterStatus {
			continue
		}

		status := st.Status
		if filterStatus == "field_checked" {
			if status == "normal" {
				status = "Bình thường (Đã kiểm tra)"
			} else {
				status = "Đang ngập (Đã kiểm tra)"
			}
		}

		res = append(res, map[string]interface{}{
			"id":             st.ID,
			"name":           st.Name,
			"org_name":       st.OrgName,
			"status":         status,
			"current_status": status,
			"street_name":    st.Name,
		})
	}
	return res, nil
}

// reportedToday reports whether a report was last touched on today's date,
// preferring its update time over its creation time.
func reportedToday(report *models.InundationReport) bool {
	if report == nil {
		return false
	}
	ts := report.MTime
	if ts <= 0 {
		ts = report.CTime
	}
	if ts == 0 {
		return false
	}
	reportTime := time.Unix(ts, 0).In(utils.VietnamLocation)
	return utils.FormatDate(utils.NowVietnam()) == utils.FormatDate(reportTime)
}

// handleRainAnalytics returns aggregated rainfall for one station, refusing
// stations outside the caller's organisation.
func (s *service) handleRainAnalytics(ctx context.Context, c *genai.FunctionCall, scope dataScope) (interface{}, error) {
	stationID, _ := c.Args["station_id"].(float64)

	if scope.OrgID != "" {
		allowed, _ := s.stationSvc.ListRainStationsFiltered(ctx, scope.OrgID, scope.RainIDs)
		found := false
		for _, st := range allowed {
			if int64(st.OldID) == int64(stationID) {
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("no permission")
		}
	}

	year, _ := c.Args["year"].(float64)
	month, _ := c.Args["month"].(float64)
	startDate, _ := c.Args["start_date"].(string)
	endDate, _ := c.Args["end_date"].(string)
	groupBy, _ := c.Args["group_by"].(string)
	return s.stationDataSvc.GetRainAnalytics(ctx, int64(stationID), int(year), int(month), startDate, endDate, groupBy)
}

// handleCoveredWards returns the distinct wards covered by the caller's rain
// stations.
//
// The wards come back in station order. The previous implementation collected
// them into a map and ranged over it, so the order was randomised on every call
// and the same question could be answered with a differently ordered list; the
// set returned is unchanged.
func (s *service) handleCoveredWards(ctx context.Context, scope dataScope) (interface{}, error) {
	stations, _ := s.stationSvc.ListRainStationsFiltered(ctx, scope.OrgID, scope.RainIDs)
	seen := make(map[string]bool)
	var res []string
	for _, st := range stations {
		if st.TenPhuong != "" && !seen[st.TenPhuong] {
			seen[st.TenPhuong] = true
			res = append(res, st.TenPhuong)
		}
	}
	return res, nil
}
