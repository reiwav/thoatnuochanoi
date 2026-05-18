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
