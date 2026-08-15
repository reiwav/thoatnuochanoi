package gemini

// Routes a tool call from the model to the handler that serves it.
//
// These two switches are the only place tool names are bound to behaviour; the
// handlers themselves live in the tools_*.go files by domain.

import (
	"context"
	"fmt"

	"ai-api-tnhn/internal/constant"

	"github.com/google/generative-ai-go/genai"
)

func (s *service) handleToolCall(ctx context.Context, c *genai.FunctionCall, scope dataScope) (interface{}, error) {
	switch c.Name {
	case constant.ToolGoogleStatus:
		return s.googleApiSvc.GetStatus(ctx)
	case constant.ToolReadEmailByTitle:
		return s.googleApiSvc.ReadEmailByTitle(ctx, c.Args["title"].(string))
	case constant.ToolReadEmailByID:
		return s.googleApiSvc.ReadEmailByID(ctx, uint32(c.Args["id"].(float64)))
	case constant.ToolLiveRainSummary:
		return s.googleApiSvc.GetRainSummary(ctx, scope.OrgID, scope.RainIDs)
	case constant.ToolLiveWaterSummary:
		return s.googleApiSvc.GetWaterSummary(ctx, scope.OrgID, scope.waterIDs())
	case constant.ToolSystemOverview:
		if scope.OrgID == "" {
			return s.stationDataSvc.GetSystemOverview(ctx)
		}
		r, _ := s.stationSvc.ListRainStationsFiltered(ctx, scope.OrgID, scope.RainIDs)
		l, _ := s.stationSvc.ListLakeStationsFiltered(ctx, scope.OrgID, scope.LakeIDs)
		rv, _ := s.stationSvc.ListRiverStationsFiltered(ctx, scope.OrgID, scope.RiverIDs)
		return &weatherSystemOverview{TotalStations: len(r) + len(l) + len(rv), Breakdown: []weatherStationSummary{{Type: "Rain", Count: len(r)}, {Type: "Lake", Count: len(l)}, {Type: "River", Count: len(rv)}}}, nil
	case constant.ToolListStations:
		return s.handleListStations(ctx, c, scope)
	case constant.ToolRainAnalytics:
		return s.handleRainAnalytics(ctx, c, scope)
	case constant.ToolCoveredWards:
		return s.handleCoveredWards(ctx, scope)
	case constant.ToolWeatherForecast:
		return s.weatherSvc.GetForecast(ctx)
	case constant.ToolRainSummaryByWard:
		return s.stationDataSvc.GetRainSummaryByWard(ctx, int(c.Args["year"].(float64)), int(c.Args["month"].(float64)), c.Args["start_date"].(string), c.Args["end_date"].(string))
	case constant.ToolLiveInundationSummary:
		return s.handleInundationSummary(ctx, c.Args, scope)
	case constant.ToolInundationHistoryByRange:
		startDateVal, _ := c.Args["start_date"].(string)
		endDateVal, _ := c.Args["end_date"].(string)
		orgNameVal, _ := c.Args["org_name"].(string)
		return s.handleInundationHistoryByRange(ctx, startDateVal, endDateVal, orgNameVal)
	case constant.ToolLivePumpingSummary:
		p, err := s.pumpingSvc.GetPumpingStationSummary(ctx, scope.OrgID, scope.PumpingIDs)
		var ww interface{}
		if s.wastewaterSvc != nil {
			ww, _ = s.wastewaterSvc.ListFiltered(ctx, scope.OrgID, nil)
		}
		return map[string]interface{}{
			"pumping_stations":    p,
			"wastewater_stations": ww,
		}, err
	case constant.ToolLiveSluiceGateSummary:
		return s.sluiceGateSvc.GetSluiceGateSummary(ctx, scope.OrgID, scope.SluiceGateIDs)
	case constant.ToolEmergencyList, constant.ToolEmergencyHistory, constant.ToolUnfinishedEmergencyHistory, constant.ToolRecentEmergencyReports, constant.ToolReportEmergencyProgress:
		return s.handleEmergencyTool(ctx, c, scope.UserID)
	case constant.ToolDatabaseQuery:
		return s.handleDatabaseQuery(ctx, c.Args)
	case constant.ToolDatabaseAggregate:
		return s.handleDatabaseAggregate(ctx, c.Args)
	default:
		return nil, fmt.Errorf("unknown tool: %s", c.Name)
	}
}

func (s *service) handleContractToolCall(ctx context.Context, c *genai.FunctionCall) (interface{}, error) {
	switch c.Name {
	case constant.ToolContractSummary:
		return s.contractSvc.GetContractSummary(ctx)
	case constant.ToolExpiringContracts:
		days := 30
		if d, ok := c.Args["days"].(float64); ok && d > 0 {
			days = int(d)
		}
		return s.contractSvc.GetExpiringSoon(ctx, days)
	case constant.ToolExpiredContracts:
		return s.contractSvc.GetExpired(ctx)
	case constant.ToolContractStagesSoon:
		days := 30
		if d, ok := c.Args["days"].(float64); ok && d > 0 {
			days = int(d)
		}
		return s.contractSvc.GetStagesDueSoon(ctx, days)
	case constant.ToolContractStagesPassed:
		return s.contractSvc.GetStagesPassed(ctx)
	case constant.ToolSearchContracts:
		return s.contractSvc.SearchContracts(ctx, c.Args["keyword"].(string))
	default:
		return nil, fmt.Errorf("unknown tool: %s", c.Name)
	}
}
