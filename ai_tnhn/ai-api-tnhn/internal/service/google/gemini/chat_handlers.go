package gemini

import (
	"context"
	"fmt"

	"github.com/google/generative-ai-go/genai"
)

func (s *service) handleToolCall(ctx context.Context, call *genai.FunctionCall, userID string, isCompany bool) (interface{}, error) {
	name := call.Name

	// 0. Fetch User Permissions
	user, _ := s.userRepo.GetByID(ctx, userID)
	orgID := ""
	var assignedRainIDs, assignedLakeIDs, assignedRiverIDs, assignedInuIDs, assignedPumpingIDs []string
	if user != nil {
		orgID = user.OrgID
		if isCompany {
			orgID = ""
		}
		assignedRainIDs = user.AssignedRainStationIDs
		assignedLakeIDs = user.AssignedLakeStationIDs
		assignedRiverIDs = user.AssignedRiverStationIDs
		assignedInuIDs = user.AssignedInundationStationIDs
		if user.AssignedPumpingStationID != "" {
			assignedPumpingIDs = []string{user.AssignedPumpingStationID}
		}
	}

	switch name {
	// Group: Google & Emails
	case "get_google_status", "read_email_by_title", "read_email_by_id":
		return s.handleGoogleTools(ctx, call)

	// Group: Weather & Water
	case "get_live_rain_summary", "get_live_water_summary", "get_system_overview",
		"list_stations_by_type", "get_rain_analytics", "get_covered_wards",
		"get_rain_summary_by_ward", "get_rain_data_by_date", "get_lake_data_by_date",
		"get_river_data_by_date":
		return s.handleWeatherTools(ctx, call, orgID, assignedRainIDs, assignedLakeIDs, assignedRiverIDs)

	// Group: Inundation
	case "get_live_inundation_summary":
		isAllowedAll := isCompany
		if user != nil {
			isAllowedAll = isAllowedAll || user.Role == "Super Admin" || user.Role == "Manager"
		}
		return s.handleInundationTools(ctx, call, orgID, isAllowedAll, assignedInuIDs)

	// Group: Pumping
	case "get_live_pumping_summary":
		return s.handlePumpingTools(ctx, call, orgID, assignedPumpingIDs)

	// Group: Emergency Construction
	case "get_emergency_constructions", "get_emergency_work_history",
		"get_unfinished_emergency_work_history", "get_recent_emergency_reports",
		"report_emergency_work_progress":
		return s.handleConstructionTools(ctx, call, userID)

	// Group: Direct Query
	case "database_query":
		return s.handleQueryTools(ctx, call)

	default:
		return nil, fmt.Errorf("unknown tool: %s", name)
	}
}

