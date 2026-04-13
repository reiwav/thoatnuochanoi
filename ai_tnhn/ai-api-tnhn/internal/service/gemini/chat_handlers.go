package gemini

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/generative-ai-go/genai"
)

func (s *service) handleToolCall(ctx context.Context, call *genai.FunctionCall, userID string, isCompany bool) (interface{}, error) {
	name := call.Name

	// 0. Fetch User Permissions
	user, _ := s.userRepo.GetByID(ctx, userID)
	orgID := ""
	var assignedRainIDs, assignedLakeIDs, assignedRiverIDs, assignedInuIDs []string
	if user != nil {
		orgID = user.OrgID
		if isCompany || user.Role == "super_admin" {
			orgID = ""
		}
		assignedRainIDs = user.AssignedRainStationIDs
		assignedLakeIDs = user.AssignedLakeStationIDs
		assignedRiverIDs = user.AssignedRiverStationIDs
		assignedInuIDs = user.AssignedInundationStationIDs
	}

	// Group: Google & Emails
	if name == "get_google_status" || strings.HasPrefix(name, "read_email_") {
		return s.handleGoogleTools(ctx, call)
	}

	// Group: Weather & Water
	if name == "get_live_rain_summary" || name == "get_live_water_summary" ||
		strings.HasSuffix(name, "_data_by_date") || name == "get_system_overview" ||
		name == "list_stations_by_type" || name == "get_rain_analytics" ||
		name == "get_covered_wards" || name == "get_rain_summary_by_ward" {
		return s.handleWeatherTools(ctx, call, orgID, assignedRainIDs, assignedLakeIDs, assignedRiverIDs)
	}

	// Group: Inundation
	if name == "get_live_inundation_summary" {
		return s.handleInundationTools(ctx, call, orgID, assignedInuIDs)
	}

	// Group: Emergency Construction
	if strings.HasPrefix(name, "get_emergency_") || strings.HasPrefix(name, "get_unfinished_") ||
		strings.HasPrefix(name, "get_recent_") || name == "report_emergency_work_progress" {
		return s.handleConstructionTools(ctx, call, userID)
	}

	// Group: Direct Query
	if name == "database_query" {
		return s.handleQueryTools(ctx, call)
	}

	return nil, fmt.Errorf("unknown tool group for: %s", name)
}
