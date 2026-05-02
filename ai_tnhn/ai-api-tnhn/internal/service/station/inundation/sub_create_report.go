package inundation

import (
	"ai-api-tnhn/constant"
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/station/inundation/shared"
	"ai-api-tnhn/utils/web"
	"context"
	"fmt"
	"time"

	"github.com/rs/xid"
)

func (s *service) CreateReport(ctx context.Context, user *models.User, input models.InundationReportBase, images []ImageContent) (*models.InundationReport, error) {
	// 3. Get Point info
	if input.PointID == "" {
		return nil, web.BadRequest("Point ID is required")
	}
	// 1. Permission Check for Employee
	err := s.validAssigned(user, input.PointID)
	if err != nil {
		return nil, err
	}
	point, err := s.inundationStationRepo.GetByID(ctx, input.PointID)
	if err != nil {
		return nil, err
	}
	reportID := "inrep" + xid.New().String()
	reportUpdateID := "repup" + xid.New().String()

	// 4. Save images locally for async upload
	imagesSave, err := s.saveAndGetImages(images, reportID)
	if err != nil {
		return nil, err
	}
	report, err := s.setNewAndCreateReport(ctx, user, input, point, imagesSave, reportID, reportUpdateID)
	if err != nil {
		return nil, err
	}
	// Update station status
	if point != nil {
		if report.IsFlooding {
			point.ReportID = report.ID
		} else {
			point.ReportID = ""
		}
		point.LastReportID = report.ID
		err = s.inundationStationRepo.Update(ctx, point)
		if err != nil {
			fmt.Printf("ERROR: failed to update station status: %v\n", err)
		}
	}
	fmt.Printf("=========== Report Update: %v\n", report)
	// ALWAYS Create an initial update record for history/timeline consistency
	shared.SetAndCreateInundationUpdate(ctx, report, s.inundationUpdateRepo)

	// Notify SSE subscribers about the change
	go s.notifyPointChange(input.PointID)

	return report, nil
}

func (s *service) setNewAndCreateReport(ctx context.Context, user *models.User,
	input models.InundationReportBase, station *models.InundationStation,
	images []string, reportID, lastReportUpdateID string) (*models.InundationReport, error) {
	// Calculate Flood Level
	level := s.calculateFloodLevel(ctx, input.Depth)
	if level == nil {
		return nil, web.BadRequest("Flood level not found")
	}

	input.UserID = user.ID
	input.UserEmail = user.Email
	input.UserName = user.Name
	input.Images = images
	input.PointID = station.ID
	report := &models.InundationReport{
		BaseModel: model.BaseModel{
			ID: reportID,
		},
		InundationReportBase: input,
		OrgID:                station.OrgID,
		SharedOrgIDs:         station.SharedOrgIDs,
		Status:               "active",
		LastReportID:         lastReportUpdateID,
	}
	report.FloodLevelName = level.Name
	report.FloodLevelColor = level.Color
	report.IsFlooding = level.IsFlooding
	if !level.IsFlooding {
		report.Status = constant.InundationStatusResolved
		report.EndTime = time.Now().Unix()
	}
	// 5. Save report to DB
	report.TrafficStatus = report.FloodLevelName

	err := s.InundationReportRepo.R_Create(ctx, report)
	return report, err
}

func (s *service) setAndUpdateReport(ctx context.Context, user *models.User,
	input models.InundationReportBase, report *models.InundationReport,
	images []string) (*models.InundationReport, error) {
	// Calculate Flood Level
	level := s.calculateFloodLevel(ctx, input.Depth)
	if level == nil {
		return nil, web.BadRequest("Flood level not found")
	}

	input.UserID = user.ID
	input.UserEmail = user.Email
	input.UserName = user.Name
	input.Images = images

	input.ReportBase.FloodLevelName = level.Name
	input.ReportBase.FloodLevelColor = level.Color
	input.ReportBase.IsFlooding = level.IsFlooding
	// 5. Save input.ReportBase to DB
	input.ReportBase.TrafficStatus = input.ReportBase.FloodLevelName

	report.InundationReportBase = input
	err := s.InundationReportRepo.R_Update(ctx, report)
	return report, err
}
