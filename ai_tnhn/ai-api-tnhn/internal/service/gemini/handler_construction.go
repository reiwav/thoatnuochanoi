package gemini

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"time"

	"github.com/google/generative-ai-go/genai"
	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) handleConstructionTools(ctx context.Context, call *genai.FunctionCall, userID string) (interface{}, error) {
	switch call.Name {
	case "report_emergency_work_progress":
		constructionID, _ := call.Args["construction_id"].(string)
		workDone, _ := call.Args["work_done"].(string)
		progressPercentage, _ := call.Args["progress_percentage"].(float64)
		issues, _ := call.Args["issues"].(string)
		isCompleted, _ := call.Args["is_completed"].(bool)
		expectedDateStr, _ := call.Args["expected_completion_date"].(string)
		var expectedDate int64
		if expectedDateStr != "" {
			t, err := time.Parse("2006-01-02", expectedDateStr)
			if err == nil {
				expectedDate = t.Unix()
			}
		}
		progress := &models.EmergencyConstructionProgress{
			ConstructionID:         constructionID,
			ReportDate:             time.Now().Unix(),
			WorkDone:               workDone,
			ProgressPercentage:     int(progressPercentage),
			Issues:                 issues,
			IsCompleted:            isCompleted,
			ExpectedCompletionDate: expectedDate,
			ReportedBy:             userID,
		}
		err := s.emcSvc.ReportProgress(ctx, progress, nil)
		if err != nil {
			return nil, err
		}
		return map[string]string{"status": "success", "message": "Báo cáo tiến độ thành công"}, nil

	case "get_emergency_work_history":
		constructionID, _ := call.Args["construction_id"].(string)
		return s.emcSvc.GetProgressHistory(ctx, constructionID)

	case "get_emergency_constructions":
		result, _, err := s.emcSvc.List(ctx, filter.NewPaginationFilter())
		return result, err

	case "get_recent_emergency_reports":
		startDateStr, _ := call.Args["start_date"].(string)
		endDateStr, _ := call.Args["end_date"].(string)
		f := filter.NewPaginationFilter()
		f.PerPage = 200
		start := time.Now().AddDate(0, 0, -2)
		start = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, time.Local)
		end := time.Now()
		end = time.Date(end.Year(), end.Month(), end.Day(), 23, 59, 59, 0, time.Local)
		if startDateStr != "" {
			if t, e := time.Parse("2006-01-02", startDateStr); e == nil {
				start = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.Local)
			}
		}
		if endDateStr != "" {
			if t, e := time.Parse("2006-01-02", endDateStr); e == nil {
				end = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, time.Local)
			}
		}
		f.AddWhere("report_date", "report_date", bson.M{
			"$gte": start.Unix(),
			"$lte": end.Unix(),
		})
		result, _, err := s.emcSvc.ListHistory(ctx, f)
		return result, err

	case "get_unfinished_emergency_work_history":
		return s.emcSvc.GetUnfinishedProgressHistory(ctx)

	default:
		return nil, fmt.Errorf("unknown construction tool: %s", call.Name)
	}
}
