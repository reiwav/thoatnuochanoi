package gemini

// Emergency-construction tool handlers: filing progress and reading history.

import (
	"context"
	"fmt"
	"time"

	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/constant"
	"ai-api-tnhn/internal/models"

	"github.com/google/generative-ai-go/genai"
	"go.mongodb.org/mongo-driver/bson"
)

// recentReportsPerPage is the page size for the recent-reports listing, large
// enough that a few days of reports arrive in one page.
const recentReportsPerPage = 200

// recentReportsDefaultDays is how far back the recent-reports listing looks when
// the caller gives no date range.
const recentReportsDefaultDays = 2

// handleEmergencyTool serves the emergency-construction tool family: progress
// reporting plus the various history and listing queries.
func (s *service) handleEmergencyTool(ctx context.Context, c *genai.FunctionCall, uID string) (interface{}, error) {
	args := callArgs(c)

	switch c.Name {
	case constant.ToolReportEmergencyProgress:
		return s.reportEmergencyProgress(ctx, args, uID)

	case constant.ToolEmergencyHistory:
		constructionID, err := requireStr(args, "construction_id")
		if err != nil {
			return nil, err
		}
		return s.emcSvc.GetProgressHistory(ctx, constructionID)

	case constant.ToolEmergencyList:
		res, _, err := s.emcSvc.List(ctx, filter.NewPaginationFilter())
		return res, err

	case constant.ToolRecentEmergencyReports:
		return s.recentEmergencyReports(ctx, args)

	case constant.ToolUnfinishedEmergencyHistory:
		return s.emcSvc.GetUnfinishedProgressHistory(ctx)

	default:
		return nil, fmt.Errorf("unknown tool")
	}
}

// reportEmergencyProgress files a progress update against a construction.
//
// Only construction_id and work_done are declared Required; the rest are
// optional and default to "no issues, not complete, 0%".
func (s *service) reportEmergencyProgress(ctx context.Context, args map[string]interface{}, uID string) (interface{}, error) {
	constructionID, err := requireStr(args, "construction_id")
	if err != nil {
		return nil, err
	}
	workDone, err := requireStr(args, "work_done")
	if err != nil {
		return nil, err
	}

	p := &models.EmergencyConstructionProgress{
		ConstructionID:     constructionID,
		ReportDate:         time.Now().Unix(),
		WorkDone:           workDone,
		ProgressPercentage: intOr(args, "progress_percentage", 0),
		Issues:             strOr(args, "issues", ""),
		IsCompleted:        boolOr(args, "is_completed", false),
		ReportedBy:         uID,
	}
	if ed := strOr(args, "expected_completion_date", ""); ed != "" {
		if t, e := time.Parse("2006-01-02", ed); e == nil {
			p.ExpectedCompletionDate = t.Unix()
		}
	}

	return map[string]string{"status": "success"}, s.emcSvc.ReportProgress(ctx, p, nil)
}

// recentEmergencyReports lists progress reports filed in a date range,
// defaulting to the last couple of days.
func (s *service) recentEmergencyReports(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	f := filter.NewPaginationFilter()
	f.PerPage = recentReportsPerPage

	start := time.Now().AddDate(0, 0, -recentReportsDefaultDays)
	end := time.Now()
	if v := strOr(args, "start_date", ""); v != "" {
		if t, e := time.Parse("2006-01-02", v); e == nil {
			start = t
		}
	}
	if v := strOr(args, "end_date", ""); v != "" {
		if t, e := time.Parse("2006-01-02", v); e == nil {
			end = t
		}
	}

	f.AddWhere("report_date", "report_date", bson.M{"$gte": start.Unix(), "$lte": end.Unix()})
	res, _, err := s.emcSvc.ListHistory(ctx, f)
	return res, err
}
