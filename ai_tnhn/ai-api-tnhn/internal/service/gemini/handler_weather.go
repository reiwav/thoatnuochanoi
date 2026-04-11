package gemini

import (
	"context"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func (s *service) handleWeatherTools(ctx context.Context, call *genai.FunctionCall) (interface{}, error) {
	switch call.Name {
	case "get_live_rain_summary":
		return s.googleApiSvc.GetRainSummary(ctx)
	case "get_live_water_summary":
		return s.googleApiSvc.GetWaterSummary(ctx)
	case "get_rain_data_by_date":
		date, _ := call.Args["date"].(string)
		return s.waterSvc.GetRainDataByDate(ctx, date)
	case "get_lake_data_by_date":
		date, _ := call.Args["date"].(string)
		return s.waterSvc.GetLakeDataByDate(ctx, date)
	case "get_river_data_by_date":
		date, _ := call.Args["date"].(string)
		return s.waterSvc.GetRiverDataByDate(ctx, date)
	case "get_system_overview":
		return s.stationDataSvc.GetSystemOverview(ctx)
	case "list_stations_by_type":
		stationType, _ := call.Args["type"].(string)
		return s.stationDataSvc.GetStationsByType(ctx, stationType)
	case "get_rain_analytics":
		stationID, _ := call.Args["station_id"].(float64)
		year, _ := call.Args["year"].(float64)
		month, _ := call.Args["month"].(float64)
		startDate, _ := call.Args["start_date"].(string)
		endDate, _ := call.Args["end_date"].(string)
		groupBy, _ := call.Args["group_by"].(string)
		return s.stationDataSvc.GetRainAnalytics(ctx, int64(stationID), int(year), int(month), startDate, endDate, groupBy)
	case "get_covered_wards":
		return s.stationDataSvc.GetCoveredWards(ctx)
	case "get_rain_summary_by_ward":
		year, _ := call.Args["year"].(float64)
		month, _ := call.Args["month"].(float64)
		startDate, _ := call.Args["start_date"].(string)
		endDate, _ := call.Args["end_date"].(string)
		return s.stationDataSvc.GetRainSummaryByWard(ctx, int(year), int(month), startDate, endDate)
	default:
		return nil, fmt.Errorf("unknown weather tool: %s", call.Name)
	}
}
