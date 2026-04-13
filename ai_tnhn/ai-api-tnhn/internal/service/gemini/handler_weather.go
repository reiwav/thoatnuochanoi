package gemini

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/googleapi"
	"context"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func (s *service) handleWeatherTools(ctx context.Context, call *genai.FunctionCall, orgID string, assignedRainIDs, assignedLakeIDs, assignedRiverIDs []string) (interface{}, error) {
	switch call.Name {
	case "get_live_rain_summary":
		summary, err := s.googleApiSvc.GetRainSummary(ctx, orgID)
		if err != nil {
			return nil, err
		}
		if orgID != "all" {
			allowed, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, assignedRainIDs)
			allowedNames := make(map[string]bool)
			for _, st := range allowed {
				allowedNames[st.TenPhuong] = true
			}

			var filteredMeasurements []googleapi.RainStationStat
			for _, m := range summary.Measurements {
				if allowedNames[m.Name] {
					filteredMeasurements = append(filteredMeasurements, m)
				}
			}
			summary.Measurements = filteredMeasurements
			summary.RainyStations = len(filteredMeasurements)
			summary.TotalStations = len(allowed)
			if summary.RainyStations > 0 {
				summary.MaxRainStation = filteredMeasurements[0]
			} else {
				summary.MaxRainStation = googleapi.RainStationStat{}
			}
		}
		return summary, nil

	case "get_live_water_summary":
		summary, err := s.googleApiSvc.GetWaterSummary(ctx)
		if err != nil {
			return nil, err
		}
		if orgID != "all" {
			allowedLakes, _ := s.stationSvc.ListLakeStationsFiltered(ctx, orgID, assignedLakeIDs)
			allowedRivers, _ := s.stationSvc.ListRiverStationsFiltered(ctx, orgID, assignedRiverIDs)

			allowedLakeNames := make(map[string]bool)
			for _, st := range allowedLakes {
				allowedLakeNames[st.TenTram] = true
			}
			allowedRiverNames := make(map[string]bool)
			for _, st := range allowedRivers {
				allowedRiverNames[st.TenTram] = true
			}

			var filteredLakes []googleapi.WaterStationStat
			for _, st := range summary.LakeStations {
				if allowedLakeNames[st.Name] {
					filteredLakes = append(filteredLakes, st)
				}
			}
			var filteredRivers []googleapi.WaterStationStat
			for _, st := range summary.RiverStations {
				if allowedRiverNames[st.Name] {
					filteredRivers = append(filteredRivers, st)
				}
			}
			summary.LakeStations = filteredLakes
			summary.RiverStations = filteredRivers
		}
		return summary, nil

	case "get_rain_data_by_date":
		date, _ := call.Args["date"].(string)
		data, err := s.waterSvc.GetRainDataByDate(ctx, date)
		if err != nil {
			return nil, err
		}
		if orgID != "all" {
			allowed, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, assignedRainIDs)
			allowedIDs := make(map[int]bool)
			for _, st := range allowed {
				allowedIDs[st.OldID] = true
			}

			var filtered []*models.RainRecord
			for _, d := range data {
				if allowedIDs[int(d.StationID)] {
					filtered = append(filtered, d)
				}
			}
			return filtered, nil
		}
		return data, nil

	case "get_system_overview":
		if orgID == "all" {
			return s.stationDataSvc.GetSystemOverview(ctx)
		}
		// Calculate custom overview for perm-restricted user
		rain, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, assignedRainIDs)
		lake, _ := s.stationSvc.ListLakeStationsFiltered(ctx, orgID, assignedLakeIDs)
		river, _ := s.stationSvc.ListRiverStationsFiltered(ctx, orgID, assignedRiverIDs)

		return &weatherSystemOverview{
			TotalStations: len(rain) + len(lake) + len(river),
			Breakdown: []weatherStationSummary{
				{Type: "Trạm đo mưa", Count: len(rain)},
				{Type: "Trạm hồ", Count: len(lake)},
				{Type: "Trạm sông", Count: len(river)},
			},
		}, nil

	case "list_stations_by_type":
		stationType, _ := call.Args["type"].(string)
		switch stationType {
		case "rain":
			stations, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, assignedRainIDs)
			var result []map[string]interface{}
			for _, st := range stations {
				result = append(result, map[string]interface{}{"id": st.ID, "name": st.TenTram, "phuong": st.TenPhuong, "address": st.DiaChi})
			}
			return result, nil
		case "lake":
			stations, _ := s.stationSvc.ListLakeStationsFiltered(ctx, orgID, assignedLakeIDs)
			var result []map[string]interface{}
			for _, st := range stations {
				result = append(result, map[string]interface{}{"id": st.ID, "name": st.TenTram, "phuong": st.TenPhuong, "loai": st.Loai})
			}
			return result, nil
		case "river":
			stations, _ := s.stationSvc.ListRiverStationsFiltered(ctx, orgID, assignedRiverIDs)
			var result []map[string]interface{}
			for _, st := range stations {
				result = append(result, map[string]interface{}{"id": st.ID, "name": st.TenTram, "phuong": st.TenPhuong, "loai": st.Loai})
			}
			return result, nil
		}
		return nil, fmt.Errorf("loại trạm không hợp lệ: %s", stationType)

	case "get_rain_analytics":
		stationID, _ := call.Args["station_id"].(float64)
		// Verification check: does user have access to this stationID?
		if orgID != "all" {
			allowed, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, assignedRainIDs)
			found := false
			for _, st := range allowed {
				if int64(st.OldID) == int64(stationID) {
					found = true
					break
				}
			}
			if !found {
				return nil, fmt.Errorf("bạn không có quyền truy cập dữ liệu trạm này")
			}
		}
		year, _ := call.Args["year"].(float64)
		month, _ := call.Args["month"].(float64)
		startDate, _ := call.Args["start_date"].(string)
		endDate, _ := call.Args["end_date"].(string)
		groupBy, _ := call.Args["group_by"].(string)
		return s.stationDataSvc.GetRainAnalytics(ctx, int64(stationID), int(year), int(month), startDate, endDate, groupBy)

	case "get_covered_wards":
		wards := make(map[string]bool)
		rain, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, assignedRainIDs)
		for _, st := range rain {
			if st.TenPhuong != "" {
				wards[st.TenPhuong] = true
			}
		}
		var result []string
		for w := range wards {
			result = append(result, w)
		}
		return result, nil

	case "get_rain_summary_by_ward":
		data, err := s.stationDataSvc.GetRainSummaryByWard(ctx, int(call.Args["year"].(float64)), int(call.Args["month"].(float64)), call.Args["start_date"].(string), call.Args["end_date"].(string))
		if err != nil {
			return nil, err
		}
		return data, nil

	default:
		return nil, fmt.Errorf("unknown weather tool: %s", call.Name)
	}
}

type weatherStationSummary struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
}

type weatherSystemOverview struct {
	TotalStations int                     `json:"total_stations"`
	Breakdown     []weatherStationSummary `json:"breakdown"`
}
