package googleapi

import (
	"ai-api-tnhn/internal/constant"
	"context"
	"fmt"
	"strings"
	"time"
)

// reportScope is how much of the system a generated report may cover.
type reportScope struct {
	// CityWide means the report is not restricted to one organisation.
	CityWide      bool
	OrgID         string
	RainIDs       []string
	LakeIDs       []string
	RiverIDs      []string
	InundationIDs []string
}

// resolveReportScope decides the widest scope a user may see in a report.
//
// Only company-wide roles and super admins get the whole city; anyone else is
// confined to their organisation and assigned stations. This mirrors
// gemini.resolveScope so a report and a chat answer agree for the same user.
func (s *service) resolveReportScope(ctx context.Context, userID string) reportScope {
	if userID == "" || s.userRepo == nil {
		return reportScope{CityWide: true}
	}

	u, _ := s.userRepo.GetByID(ctx, userID)
	if u == nil {
		return reportScope{CityWide: true}
	}

	// User.IsCompany and User.IsEmployee are bson:"-", so a user loaded straight
	// from the repository always has them false. They are derived from the role
	// record, exactly as auth and the request middleware do.
	if s.roleRepo != nil {
		if roleData, _ := s.roleRepo.GetByCode(ctx, u.Role); roleData != nil {
			u.IsEmployee = roleData.IsEmployee
			u.IsCompany = roleData.IsCompany
		}
	}

	if u.IsCompany || u.Role == constant.ROLE_SUPER_ADMIN || u.OrgID == "" {
		return reportScope{CityWide: true}
	}

	return reportScope{
		OrgID:         u.OrgID,
		RainIDs:       u.AssignedRainStationIDs,
		LakeIDs:       u.AssignedLakeStationIDs,
		RiverIDs:      u.AssignedRiverStationIDs,
		InundationIDs: u.AssignedInundationStationIDs,
	}
}

// statusForUser gathers the city status at the widest scope the user may see.
func (s *service) statusForUser(ctx context.Context, userID string) (*CityStatus, error) {
	scope := s.resolveReportScope(ctx, userID)
	if scope.CityWide {
		return s.GetCityStatus(ctx)
	}
	return s.GetCityStatusForUser(ctx, scope.OrgID, scope.RainIDs, scope.LakeIDs, scope.RiverIDs, scope.InundationIDs)
}

func (s *service) GenerateAIReport(ctx context.Context, reportType string, userID string) (*ChatResponse, error) {
	if s.geminiSvc == nil {
		return nil, fmt.Errorf("gemini service is not initialized")
	}

	status, err := s.statusForUser(ctx, userID)
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
