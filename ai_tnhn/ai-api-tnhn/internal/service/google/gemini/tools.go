package gemini

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"time"

	"github.com/google/generative-ai-go/genai"
	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) getChatTools() []*genai.FunctionDeclaration {
	return []*genai.FunctionDeclaration{
		{Name: constant.ToolGoogleStatus, Description: constant.ToolDescriptions[constant.ToolGoogleStatus]},
		{Name: constant.ToolLiveRainSummary, Description: constant.ToolDescriptions[constant.ToolLiveRainSummary]},
		{Name: constant.ToolRainDataByDate, Description: constant.ToolDescriptions[constant.ToolRainDataByDate],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"date": {Type: genai.TypeString, Description: "YYYY-MM-DD"}}, Required: []string{"date"}}},
		{Name: constant.ToolLakeDataByDate, Description: constant.ToolDescriptions[constant.ToolLakeDataByDate],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"date": {Type: genai.TypeString, Description: "YYYY-MM-DD"}}, Required: []string{"date"}}},
		{Name: constant.ToolRiverDataByDate, Description: constant.ToolDescriptions[constant.ToolRiverDataByDate],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"date": {Type: genai.TypeString, Description: "YYYY-MM-DD"}}, Required: []string{"date"}}},
		{Name: constant.ToolSystemOverview, Description: constant.ToolDescriptions[constant.ToolSystemOverview]},
		{Name: constant.ToolListStations, Description: constant.ToolDescriptions[constant.ToolListStations],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"type": {Type: genai.TypeString, Description: "rain/lake/river"}}, Required: []string{"type"}}},
		{Name: constant.ToolRainAnalytics, Description: constant.ToolDescriptions[constant.ToolRainAnalytics],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"station_id": {Type: genai.TypeInteger}, "year": {Type: genai.TypeInteger}, "month": {Type: genai.TypeInteger}, "start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}, "group_by": {Type: genai.TypeString}}}},
		{Name: constant.ToolCoveredWards, Description: constant.ToolDescriptions[constant.ToolCoveredWards]},
		{Name: constant.ToolWeatherForecast, Description: constant.ToolDescriptions[constant.ToolWeatherForecast]},
		{Name: constant.ToolLiveWaterSummary, Description: constant.ToolDescriptions[constant.ToolLiveWaterSummary]},
		{Name: constant.ToolLiveInundationSummary, Description: constant.ToolDescriptions[constant.ToolLiveInundationSummary]},
		{Name: constant.ToolLivePumpingSummary, Description: constant.ToolDescriptions[constant.ToolLivePumpingSummary]},
		{Name: constant.ToolRainSummaryByWard, Description: constant.ToolDescriptions[constant.ToolRainSummaryByWard],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"year": {Type: genai.TypeInteger}, "month": {Type: genai.TypeInteger}, "start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}}}},
		{Name: constant.ToolDatabaseQuery, Description: constant.ToolDescriptions[constant.ToolDatabaseQuery],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"collection": {Type: genai.TypeString}, "filter": {Type: genai.TypeObject}}, Required: []string{"collection"}}},
		{Name: constant.ToolReadEmailByTitle, Description: constant.ToolDescriptions[constant.ToolReadEmailByTitle],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"title": {Type: genai.TypeString}}, Required: []string{"title"}}},
		{Name: constant.ToolReadEmailByID, Description: constant.ToolDescriptions[constant.ToolReadEmailByID],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"id": {Type: genai.TypeInteger}}, Required: []string{"id"}}},
		{Name: constant.ToolReportEmergencyProgress, Description: constant.ToolDescriptions[constant.ToolReportEmergencyProgress],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"construction_id": {Type: genai.TypeString}, "work_done": {Type: genai.TypeString}, "progress_percentage": {Type: genai.TypeInteger}, "issues": {Type: genai.TypeString}, "is_completed": {Type: genai.TypeBoolean}, "expected_completion_date": {Type: genai.TypeString}}, Required: []string{"construction_id", "work_done"}}},
		{Name: constant.ToolEmergencyHistory, Description: constant.ToolDescriptions[constant.ToolEmergencyHistory],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"construction_id": {Type: genai.TypeString}}, Required: []string{"construction_id"}}},
		{Name: constant.ToolEmergencyList, Description: constant.ToolDescriptions[constant.ToolEmergencyList]},
		{Name: constant.ToolRecentEmergencyReports, Description: constant.ToolDescriptions[constant.ToolRecentEmergencyReports],
			Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"start_date": {Type: genai.TypeString}, "end_date": {Type: genai.TypeString}}}},
		{Name: constant.ToolUnfinishedEmergencyHistory, Description: constant.ToolDescriptions[constant.ToolUnfinishedEmergencyHistory]},
	}
}

func (s *service) getContractTools() []*genai.FunctionDeclaration {
	return []*genai.FunctionDeclaration{
		{Name: constant.ToolContractSummary, Description: constant.ToolDescriptions[constant.ToolContractSummary]},
		{Name: constant.ToolExpiringContracts, Description: constant.ToolDescriptions[constant.ToolExpiringContracts], Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"days": {Type: genai.TypeInteger}}}},
		{Name: constant.ToolExpiredContracts, Description: constant.ToolDescriptions[constant.ToolExpiredContracts]},
		{Name: constant.ToolContractStagesSoon, Description: constant.ToolDescriptions[constant.ToolContractStagesSoon], Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"days": {Type: genai.TypeInteger}}}},
		{Name: constant.ToolContractStagesPassed, Description: constant.ToolDescriptions[constant.ToolContractStagesPassed]},
		{Name: constant.ToolSearchContracts, Description: constant.ToolDescriptions[constant.ToolSearchContracts], Parameters: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"keyword": {Type: genai.TypeString}}, Required: []string{"keyword"}}},
	}
}

func (s *service) handleToolCall(ctx context.Context, c *genai.FunctionCall, uID string, isC bool) (interface{}, error) {
	u, _ := s.userRepo.GetByID(ctx, uID)
	orgID := ""
	var aRain, aLake, aRiver, aInu []string
	if u != nil {
		orgID = u.OrgID
		if isC {
			orgID = ""
		}
		aRain, aLake, aRiver, aInu = u.AssignedRainStationIDs, u.AssignedLakeStationIDs, u.AssignedRiverStationIDs, u.AssignedInundationStationIDs
		if u.AssignedPumpingStationID != "" {
			aPump := []string{u.AssignedPumpingStationID}
			_ = aPump // to avoid unused if needed, though used below
		}
	}
	switch c.Name {
	case constant.ToolGoogleStatus:
		return s.googleApiSvc.GetStatus(ctx)
	case constant.ToolReadEmailByTitle:
		return s.googleApiSvc.ReadEmailByTitle(ctx, c.Args["title"].(string))
	case constant.ToolReadEmailByID:
		return s.googleApiSvc.ReadEmailByID(ctx, uint32(c.Args["id"].(float64)))
	case constant.ToolLiveRainSummary:
		return s.googleApiSvc.GetRainSummary(ctx, orgID, aRain)
	case constant.ToolLiveWaterSummary:
		return s.googleApiSvc.GetWaterSummary(ctx, orgID, append(aLake, aRiver...))
	case constant.ToolRainDataByDate:
		return s.handleDR(ctx, c, orgID, aRain)
	case constant.ToolSystemOverview:
		if orgID == "" {
			return s.stationDataSvc.GetSystemOverview(ctx)
		}
		r, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, aRain)
		l, _ := s.stationSvc.ListLakeStationsFiltered(ctx, orgID, aLake)
		rv, _ := s.stationSvc.ListRiverStationsFiltered(ctx, orgID, aRiver)
		return &weatherSystemOverview{TotalStations: len(r) + len(l) + len(rv), Breakdown: []weatherStationSummary{{Type: "Rain", Count: len(r)}, {Type: "Lake", Count: len(l)}, {Type: "River", Count: len(rv)}}}, nil
	case constant.ToolListStations:
		return s.handleLS(ctx, c, orgID, aRain, aLake, aRiver)
	case constant.ToolRainAnalytics:
		return s.handleRA(ctx, c, orgID, aRain)
	case constant.ToolCoveredWards:
		return s.handleCW(ctx, orgID, aRain)
	case constant.ToolWeatherForecast:
		return s.weatherSvc.GetForecast(ctx)
	case constant.ToolRainSummaryByWard:
		return s.stationDataSvc.GetRainSummaryByWard(ctx, int(c.Args["year"].(float64)), int(c.Args["month"].(float64)), c.Args["start_date"].(string), c.Args["end_date"].(string))
	case constant.ToolLiveInundationSummary:
		r := isC
		if u != nil {
			r = r || u.Role == "Super Admin" || u.Role == "Manager"
		}
		return s.inuSvc.GetInundationSummary(ctx, orgID, r, aInu)
	case constant.ToolLivePumpingSummary:
		var aPump []string
		if u != nil && u.AssignedPumpingStationID != "" {
			aPump = []string{u.AssignedPumpingStationID}
		}
		p, err := s.pumpingSvc.GetPumpingStationSummary(ctx, orgID, aPump)
		var ww interface{}
		if s.wastewaterSvc != nil {
			ww, _ = s.wastewaterSvc.ListFiltered(ctx, orgID, nil)
		}
		return map[string]interface{}{
			"pumping_stations": p,
			"wastewater_stations": ww,
		}, err
	case constant.ToolEmergencyList, constant.ToolEmergencyHistory, constant.ToolUnfinishedEmergencyHistory, constant.ToolRecentEmergencyReports, constant.ToolReportEmergencyProgress:
		return s.handleCT(ctx, c, uID)
	case constant.ToolDatabaseQuery:
		return s.querySvc.Query(ctx, c.Args["collection"].(string), c.Args["filter"].(map[string]interface{}), 0)
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

func (s *service) handleDR(ctx context.Context, c *genai.FunctionCall, orgID string, ids []string) (interface{}, error) {
	d, e := s.rainSvc.GetRainDataByDate(ctx, c.Args["date"].(string))
	if e != nil || orgID == "" {
		return d, e
	}
	al, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, ids)
	am := make(map[int]bool)
	for _, st := range al {
		am[st.OldID] = true
	}
	var res []*models.RainRecord
	for _, r := range d {
		if am[int(r.StationID)] {
			res = append(res, r)
		}
	}
	return res, nil
}

func (s *service) handleLS(ctx context.Context, c *genai.FunctionCall, o string, r, l, rv []string) (interface{}, error) {
	t := c.Args["type"].(string)
	switch t {
	case "rain":
		sts, e := s.stationSvc.ListRainStationsFiltered(ctx, o, r)
		var res []map[string]interface{}
		for _, st := range sts {
			res = append(res, map[string]interface{}{"id": st.ID, "name": st.TenTram, "phuong": st.TenPhuong, "address": st.DiaChi})
		}
		return res, e
	case "lake":
		sts, e := s.stationSvc.ListLakeStationsFiltered(ctx, o, l)
		var res []map[string]interface{}
		for _, st := range sts {
			res = append(res, map[string]interface{}{"id": st.ID, "name": st.TenTram, "phuong": st.TenPhuong, "loai": st.Loai})
		}
		return res, e
	case "river":
		sts, e := s.stationSvc.ListRiverStationsFiltered(ctx, o, rv)
		var res []map[string]interface{}
		for _, st := range sts {
			res = append(res, map[string]interface{}{"id": st.ID, "name": st.TenTram, "phuong": st.TenPhuong, "loai": st.Loai})
		}
		return res, e
	}
	return nil, fmt.Errorf("invalid type")
}

func (s *service) handleRA(ctx context.Context, c *genai.FunctionCall, o string, ids []string) (interface{}, error) {
	sID, _ := c.Args["station_id"].(float64)
	if o != "" {
		al, _ := s.stationSvc.ListRainStationsFiltered(ctx, o, ids)
		f := false
		for _, st := range al {
			if int64(st.OldID) == int64(sID) {
				f = true
				break
			}
		}
		if !f {
			return nil, fmt.Errorf("no permission")
		}
	}
	y, _ := c.Args["year"].(float64)
	m, _ := c.Args["month"].(float64)
	sd, _ := c.Args["start_date"].(string)
	ed, _ := c.Args["end_date"].(string)
	gb, _ := c.Args["group_by"].(string)
	return s.stationDataSvc.GetRainAnalytics(ctx, int64(sID), int(y), int(m), sd, ed, gb)
}

func (s *service) handleCW(ctx context.Context, o string, ids []string) (interface{}, error) {
	r, _ := s.stationSvc.ListRainStationsFiltered(ctx, o, ids)
	w := make(map[string]bool)
	for _, st := range r {
		if st.TenPhuong != "" {
			w[st.TenPhuong] = true
		}
	}
	var res []string
	for k := range w {
		res = append(res, k)
	}
	return res, nil
}

func (s *service) handleCT(ctx context.Context, c *genai.FunctionCall, uID string) (interface{}, error) {
	switch c.Name {
	case constant.ToolReportEmergencyProgress:
		p := &models.EmergencyConstructionProgress{ConstructionID: c.Args["construction_id"].(string), ReportDate: time.Now().Unix(), WorkDone: c.Args["work_done"].(string), ProgressPercentage: int(c.Args["progress_percentage"].(float64)), Issues: c.Args["issues"].(string), IsCompleted: c.Args["is_completed"].(bool), ReportedBy: uID}
		if ed, ok := c.Args["expected_completion_date"].(string); ok && ed != "" {
			if t, e := time.Parse("2006-01-02", ed); e == nil {
				p.ExpectedCompletionDate = t.Unix()
			}
		}
		return map[string]string{"status": "success"}, s.emcSvc.ReportProgress(ctx, p, nil)
	case constant.ToolEmergencyHistory:
		return s.emcSvc.GetProgressHistory(ctx, c.Args["construction_id"].(string))
	case constant.ToolEmergencyList:
		res, _, e := s.emcSvc.List(ctx, filter.NewPaginationFilter())
		return res, e
	case constant.ToolRecentEmergencyReports:
		f := filter.NewPaginationFilter()
		f.PerPage = 200
		start := time.Now().AddDate(0, 0, -2)
		end := time.Now()
		if s, ok := c.Args["start_date"].(string); ok && s != "" {
			if t, e := time.Parse("2006-01-02", s); e == nil {
				start = t
			}
		}
		if e, ok := c.Args["end_date"].(string); ok && e != "" {
			if t, e := time.Parse("2006-01-02", e); e == nil {
				end = t
			}
		}
		f.AddWhere("report_date", "report_date", bson.M{"$gte": start.Unix(), "$lte": end.Unix()})
		res, _, e := s.emcSvc.ListHistory(ctx, f)
		return res, e
	case constant.ToolUnfinishedEmergencyHistory:
		return s.emcSvc.GetUnfinishedProgressHistory(ctx)
	default:
		return nil, fmt.Errorf("unknown tool")
	}
}
