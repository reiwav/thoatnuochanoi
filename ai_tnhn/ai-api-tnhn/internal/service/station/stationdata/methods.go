package stationdata

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"context"
	"fmt"
)

func (s *service) GetSystemOverview(ctx context.Context) (*SystemOverview, error) {
	_, rainCount, _ := s.stationSvc.ListRainStations(ctx, filter.NewBasicFilter())
	_, lakeCount, _ := s.stationSvc.ListLakeStations(ctx, filter.NewBasicFilter())
	_, riverCount, _ := s.stationSvc.ListRiverStations(ctx, filter.NewBasicFilter())

	overview := &SystemOverview{
		TotalStations: int(rainCount + lakeCount + riverCount),
		Breakdown: []StationSummary{
			{Type: "Trạm đo mưa", Count: int(rainCount)},
			{Type: "Trạm hồ", Count: int(lakeCount)},
			{Type: "Trạm sông", Count: int(riverCount)},
		},
	}

	return overview, nil
}

func (s *service) GetStationsByType(ctx context.Context, stationType string) (interface{}, error) {
	f := filter.NewBasicFilter()
	switch stationType {
	case "rain":
		stations, _, err := s.stationSvc.ListRainStations(ctx, f)
		if err != nil {
			return nil, err
		}
		var result []map[string]interface{}
		for _, st := range stations {
			result = append(result, map[string]interface{}{
				"id":      st.ID,
				"name":    st.TenTram,
				"phuong":  st.TenPhuong,
				"address": st.DiaChi,
			})
		}
		return result, nil
	case "lake":
		stations, _, err := s.stationSvc.ListLakeStations(ctx, f)
		if err != nil {
			return nil, err
		}
		var result []map[string]interface{}
		for _, st := range stations {
			result = append(result, map[string]interface{}{
				"id":     st.ID,
				"name":   st.TenTram,
				"phuong": st.TenPhuong,
				"loai":   st.Loai,
			})
		}
		return result, nil
	case "river":
		stations, _, err := s.stationSvc.ListRiverStations(ctx, f)
		if err != nil {
			return nil, err
		}
		var result []map[string]interface{}
		for _, st := range stations {
			result = append(result, map[string]interface{}{
				"id":     st.ID,
				"name":   st.TenTram,
				"phuong": st.TenPhuong,
				"loai":   st.Loai,
			})
		}
		return result, nil
	default:
		return nil, fmt.Errorf("loại trạm không hợp lệ: %s", stationType)
	}
}

func (s *service) GetRainAnalytics(ctx context.Context, stationID int64, year int, month int, startDate, endDate string, groupBy string) (interface{}, error) {
	if groupBy == "" {
		if year > 0 && month == 0 {
			groupBy = "month"
		} else {
			groupBy = "date"
		}
	}

	if year > 0 {
		if month > 0 {
			startDate = fmt.Sprintf("%04d-%02d-01", year, month)
			endDate = fmt.Sprintf("%04d-%02d-31", year, month)
		} else {
			startDate = fmt.Sprintf("%04d-01-01", year)
			endDate = fmt.Sprintf("%04d-12-31", year)
		}
	}

	stats, err := s.rainSvc.GetRainAggregateStats(ctx, stationID, startDate, endDate, groupBy)
	if err != nil {
		return nil, err
	}

	for i := range stats {
		if total, ok := stats[i]["total"].(float64); ok {
			stats[i]["total_text"] = fmt.Sprintf("%.1f mm", total)
		}
		if max, ok := stats[i]["max"].(float64); ok {
			stats[i]["max_text"] = fmt.Sprintf("%.1f mm", max)
		}
		if avg, ok := stats[i]["avg"].(float64); ok {
			stats[i]["avg_text"] = fmt.Sprintf("%.1f mm", avg)
		}
	}

	return stats, nil
}

func (s *service) GetCoveredWards(ctx context.Context) ([]string, error) {
	wardMap := make(map[string]bool)
	rain, _, _ := s.stationSvc.ListRainStations(ctx, filter.NewBasicFilter())
	for _, st := range rain {
		if st.TenPhuong != "" {
			wardMap[st.TenPhuong] = true
		}
	}
	lake, _, _ := s.stationSvc.ListLakeStations(ctx, filter.NewBasicFilter())
	for _, st := range lake {
		if st.TenPhuong != "" {
			wardMap[st.TenPhuong] = true
		}
	}
	river, _, _ := s.stationSvc.ListRiverStations(ctx, filter.NewBasicFilter())
	for _, st := range river {
		if st.TenPhuong != "" {
			wardMap[st.TenPhuong] = true
		}
	}
	var wards []string
	for w := range wardMap {
		wards = append(wards, w)
	}
	return wards, nil
}

func (s *service) GetRainSummaryByWard(ctx context.Context, year int, month int, startDate, endDate string) (interface{}, error) {
	if year > 0 {
		if month > 0 {
			startDate = fmt.Sprintf("%04d-%02d-01", year, month)
			endDate = fmt.Sprintf("%04d-%02d-31", year, month)
		} else {
			startDate = fmt.Sprintf("%04d-01-01", year)
			endDate = fmt.Sprintf("%04d-12-31", year)
		}
	}

	stations, _, err := s.stationSvc.ListRainStations(ctx, filter.NewBasicFilter())
	if err != nil {
		return nil, err
	}

	stationToWard := make(map[int64]string)
	for _, st := range stations {
		stationToWard[int64(st.OldID)] = st.TenPhuong
	}

	stats, err := s.rainSvc.GetRainAggregateStats(ctx, 0, startDate, endDate, "station_id")
	if err != nil {
		return nil, err
	}

	wardMap := make(map[string]*wardTemp)
	for _, raw := range stats {
		var stationID int64
		if sid, ok := raw["_id"].(int64); ok {
			stationID = sid
		} else if sid, ok := raw["_id"].(int32); ok {
			stationID = int64(sid)
		} else if sid, ok := raw["_id"].(float64); ok {
			stationID = int64(sid)
		}

		var total float64
		if t, ok := raw["total"].(float64); ok {
			total = t
		}

		var count int
		if c, ok := raw["count"].(int32); ok {
			count = int(c)
		} else if c, ok := raw["count"].(int64); ok {
			count = int(c)
		}

		var max float64
		if m, ok := raw["max"].(float64); ok {
			max = m
		}

		wardName := stationToWard[stationID]
		if wardName == "" {
			wardName = "Không xác định"
		}

		if _, ok := wardMap[wardName]; !ok {
			wardMap[wardName] = &wardTemp{}
		}

		wt := wardMap[wardName]
		wt.total += total
		wt.count += count
		if max > wt.max {
			wt.max = max
		}
	}

	var result []WardStat
	for wardName, wt := range wardMap {
		result = append(result, WardStat{
			Ward:  wardName,
			Total: fmt.Sprintf("%.1f mm", wt.total),
			Count: wt.count,
			Max:   fmt.Sprintf("%.1f mm", wt.max),
		})
	}

	return result, nil
}
