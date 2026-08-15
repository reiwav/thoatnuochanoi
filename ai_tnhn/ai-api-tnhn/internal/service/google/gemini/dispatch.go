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
	args := callArgs(c)

	switch c.Name {
	case constant.ToolGoogleStatus:
		return s.googleApiSvc.GetStatus(ctx)
	case constant.ToolReadEmailByTitle:
		title, err := requireStr(args, "title")
		if err != nil {
			return nil, err
		}
		return s.googleApiSvc.ReadEmailByTitle(ctx, title)
	case constant.ToolReadEmailByID:
		id, err := requireInt(args, "id")
		if err != nil {
			return nil, err
		}
		return s.googleApiSvc.ReadEmailByID(ctx, uint32(id))
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
		// None of these are declared Required, so all four must tolerate absence.
		// The station service treats a zero year/month and empty dates as
		// "unfiltered", which is the previous behaviour when the model sent them.
		return s.stationDataSvc.GetRainSummaryByWard(ctx,
			intOr(args, "year", 0),
			intOr(args, "month", 0),
			strOr(args, "start_date", ""),
			strOr(args, "end_date", ""))
	case constant.ToolLiveInundationSummary:
		return s.handleInundationSummary(ctx, args, scope)
	case constant.ToolInundationHistoryByRange:
		startDateVal := strOr(args, "start_date", "")
		endDateVal := strOr(args, "end_date", "")
		orgNameVal := strOr(args, "org_name", "")
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
		return s.handleDatabaseQuery(ctx, args)
	case constant.ToolDatabaseAggregate:
		return s.handleDatabaseAggregate(ctx, args)
	default:
		return nil, fmt.Errorf("unknown tool: %s", c.Name)
	}
}

// defaultContractHorizonDays is the look-ahead used when the model asks about
// upcoming contract deadlines without naming a window.
const defaultContractHorizonDays = 30

func (s *service) handleContractToolCall(ctx context.Context, c *genai.FunctionCall) (interface{}, error) {
	args := callArgs(c)

	// A non-positive horizon is meaningless, so it falls back to the default.
	horizonDays := func() int {
		if d, ok := argInt(args, "days"); ok && d > 0 {
			return d
		}
		return defaultContractHorizonDays
	}

	switch c.Name {
	case constant.ToolContractSummary:
		return s.contractSvc.GetContractSummary(ctx)
	case constant.ToolExpiringContracts:
		return s.contractSvc.GetExpiringSoon(ctx, horizonDays())
	case constant.ToolExpiredContracts:
		return s.contractSvc.GetExpired(ctx)
	case constant.ToolContractStagesSoon:
		return s.contractSvc.GetStagesDueSoon(ctx, horizonDays())
	case constant.ToolContractStagesPassed:
		return s.contractSvc.GetStagesPassed(ctx)
	case constant.ToolSearchContracts:
		keyword, err := requireStr(args, "keyword")
		if err != nil {
			return nil, err
		}
		return s.contractSvc.SearchContracts(ctx, keyword)
	default:
		return nil, fmt.Errorf("unknown tool: %s", c.Name)
	}
}
