package googleapi

import (
	"ai-api-tnhn/internal/constant"
	"context"
	"fmt"
	"strings"
	"time"
)

func (s *service) GenerateAIReport(ctx context.Context, reportType string, userID string) (*ChatResponse, error) {
	if s.geminiSvc == nil {
		return nil, fmt.Errorf("gemini service is not initialized")
	}

	var status *CityStatus
	var err error
	if userID != "" && s.userRepo != nil {
		u, _ := s.userRepo.GetByID(ctx, userID)
		if u != nil && u.OrgID != "" && !u.IsCompany && u.Role != "super_admin" {
			status, err = s.GetCityStatusForUser(ctx, u.OrgID, u.AssignedRainStationIDs, u.AssignedLakeStationIDs, u.AssignedRiverStationIDs, u.AssignedInundationStationIDs)
		} else {
			status, err = s.GetCityStatus(ctx)
		}
	} else {
		status, err = s.GetCityStatus(ctx)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get city status: %w", err)
	}

	now := time.Now()
	dd, mm, yyyy := now.Format("02"), now.Format("01"), now.Format("2006")
	hh := now.Format("15h04")

	var prompt string
	switch reportType {
	case constant.ReportTypeActiveRain:
		prompt = s.buildActiveRainPrompt(status, hh, dd, mm, yyyy)
	case constant.ReportTypeViber:
		prompt = s.buildViberPrompt(status, hh, dd, mm, yyyy)
	case constant.ReportTypeDynamic:
		prompt = s.buildDynamicPrompt(status, hh, dd, mm, yyyy)
	case constant.ReportTypeFullWord:
		prompt = s.buildFullWordPrompt(status, hh, dd, mm, yyyy)
	default:
		return nil, fmt.Errorf("unsupported report type: %s", reportType)
	}

	// If prompt is a simple message (not a complex prompt), return it directly as a ChatResponse
	lowerPrompt := strings.ToLower(prompt)
	if !strings.Contains(lowerPrompt, "nhiệm vụ") && !strings.Contains(lowerPrompt, "quy tắc") && !strings.Contains(lowerPrompt, "tóm tắt") {
		return &ChatResponse{
			Text:   prompt,
			Tables: make(map[string]interface{}),
		}, nil
	}

	res, err := s.geminiSvc.Chat(ctx, prompt, nil, userID, true, "SKIP_LOG")
	if err != nil {
		return nil, err
	}

	if res != nil {
		if res.Tables == nil {
			res.Tables = make(map[string]interface{})
		}
		// Only populate tables for non-viber reports to save resources and keep the response clean
		if reportType != constant.ReportTypeViber {
			s.populateRainTable(res, status)
			s.populateWaterTable(res, status)
			s.populateInundationTable(res, status)
			s.populatePumpingTable(res, status)
			s.populateWastewaterTable(res, status)
		}
	}

	return res, nil
}
