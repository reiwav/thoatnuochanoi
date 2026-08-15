package gemini

// Maps tool results onto the table set the frontend renders.
//
// A tool returns whatever its service returns; the frontend needs named tables
// with fixed column shapes. getToolKey names the destination table and
// mapChatTable performs the conversion, reshaping the few payloads that do not
// map one-to-one.

import (
	"log"

	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/service/google/googleapi"
	pumpingstation "ai-api-tnhn/internal/service/station/pumping_station"
	"ai-api-tnhn/internal/service/station/sluice_gate"
	"ai-api-tnhn/internal/service/station/water"
	"ai-api-tnhn/internal/service/weather"
	"ai-api-tnhn/utils"

	"github.com/google/generative-ai-go/genai"
)

// currentRainDate is indirected through a variable so tests can pin the rain day
// and keep golden output independent of the wall clock.
var currentRainDate = utils.CurrentRainDate

// getToolKey returns the table name a tool's result belongs under. An empty
// result means "do not surface a table". Unknown tools fall back to their own
// name so new tools still reach the frontend.
//
// Two keys are sentinels rather than real table names: "water_summary" and
// "pumping_summary" carry payloads that mapChatTable fans out into several
// tables.
func (s *service) getToolKey(c *genai.FunctionCall) string {
	switch c.Name {
	case "get_live_rain_summary", "get_rain_data_by_date", "get_rain_analytics", "get_rain_summary_by_ward":
		return "rains"
	case "get_live_water_summary":
		return "water_summary" // fanned out into lakes + rivers
	case "get_lake_data_by_date":
		return "lakes"
	case "get_river_data_by_date":
		return "rivers"
	case constant.ToolLiveInundationSummary, constant.ToolInundationHistoryByRange:
		return "inundations"
	case "get_live_pumping_summary":
		return "pumping_summary" // fanned out into pumping_stations + wastewater_stations
	case "get_live_sluice_gate_summary":
		return "sluice_gates"
	case "get_weather_forecast":
		return "weather_forecasts"
	case "list_stations", "list_stations_by_type":
		if t, ok := c.Args["type"].(string); ok {
			if t == "rain" {
				return "rains"
			}
			if t == "inundation" {
				return "inundations"
			}
			return "waters"
		}
		return "stations"
	case "get_unfinished_emergency_work_history", "list_emergency_reports", "get_recent_emergency_reports":
		return "emergencies"
	case "get_contract_summary", "get_expiring_contracts", "get_expired_contracts", "get_contract_stages_due_soon", "get_contract_stages_passed", "search_contracts":
		return "contracts"
	}
	return c.Name
}

// mapChatTable folds one operational tool result into the table set.
//
// Most results pass straight through under their key. The exceptions are the
// summaries whose service-side shape differs from what the frontend renders:
// pumping and sluice-gate summaries become table rows, and the water summary
// splits into separate lake and river tables. Each reshaping branch falls back
// to storing the raw payload when the type assertion fails, so an unexpected
// shape still reaches the client instead of vanishing.
func (s *service) mapChatTable(tables map[string]interface{}, c *genai.FunctionCall, res interface{}) {
	key := s.getToolKey(c)
	log.Printf("[Chat] tool=%s, key=%s, res_type=%T, res_nil=%v", c.Name, key, res, res == nil)
	if key == "" {
		return
	}

	switch key {
	case "pumping_summary":
		// One tool serves both pumping stations and wastewater plants.
		if m, ok := res.(map[string]interface{}); ok {
			for mk, mv := range m {
				if mk == "pumping_stations" {
					tables[mk] = s.transformPumpingStations(mv)
				} else {
					tables[mk] = mv
				}
			}
		}
	case "sluice_gates":
		tables["sluice_gates"] = s.transformSluiceGates(res)
	case "water_summary":
		if wsd, ok := res.(*water.WaterSummaryData); ok {
			tables["lakes"] = wsd.LakeStations
			tables["rivers"] = wsd.RiverStations
		} else {
			tables["waters"] = res
		}
	case "rains":
		if rsd, ok := res.(*weather.RainSummaryData); ok {
			tables["rains"] = rainRowsFrom(rsd, currentRainDate())
		} else {
			tables["rains"] = res
		}
	default:
		tables[key] = res
	}
}

// mapContractTable stores contract results verbatim; the contract tools already
// return frontend-ready shapes.
func (s *service) mapContractTable(tables map[string]interface{}, c *genai.FunctionCall, res interface{}) {
	if key := s.getToolKey(c); key != "" {
		tables[key] = res
	}
}

// transformPumpingStations renders a pumping summary into the shared table
// shape. Anything that is not a populated summary is passed through untouched so
// an unexpected payload still reaches the client rather than being dropped.
func (s *service) transformPumpingStations(raw interface{}) interface{} {
	if summary, ok := raw.(*pumpingstation.PumpingStationSummaryData); ok && summary != nil {
		return googleapi.NewPumpTableRows(summary)
	}
	return raw
}

// transformSluiceGates mirrors transformPumpingStations for sluice gates.
func (s *service) transformSluiceGates(raw interface{}) interface{} {
	if summary, ok := raw.(*sluice_gate.SluiceGateSummaryData); ok && summary != nil {
		return googleapi.NewSluiceGateTableRows(summary)
	}
	return raw
}

// rainRowsFrom renders a live rain summary as table rows stamped with the rain
// day the readings belong to.
func rainRowsFrom(summary *weather.RainSummaryData, rainDate string) []googleapi.RainTableRow {
	var rows []googleapi.RainTableRow
	for i, m := range summary.Measurements {
		rows = append(rows, googleapi.NewRainTableRow(
			i+1, m.ID, m.OldID, m.Name, m.Address, m.Type, m.Priority,
			m.TotalRain, m.IsRaining, m.StartTime, m.EndTime, rainDate,
		))
	}
	return rows
}
