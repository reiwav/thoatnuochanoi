package inundation

import (
	"ai-api-tnhn/internal/models"
	"context"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) GetPointByID(ctx context.Context, id string) (*models.InundationStation, error) {
	return s.inundationStationRepo.GetByID(ctx, id)
}
func (s *service) CreatePoint(ctx context.Context, point models.InundationStation) (string, error) {
	if point.Active == false {
		point.Active = true
	}
	return s.inundationStationRepo.Create(ctx, &point)
}
func (s *service) GetPointsStatus(ctx context.Context, user *models.User, isAllowedAll bool, orgIDFilter string) ([]PointStatus, error) {
	var orgID string
	var pointIDs []string

	if user.IsEmployee && !isAllowedAll { // nếu là nhân viên và không được phép xem tất cả các điểm
		// Employee: only points assigned to account
		for _, pid := range user.AssignedInundationStationIDs {
			if pid != "" {
				pointIDs = append(pointIDs, pid)
			}
		}
		if len(pointIDs) == 0 {
			return []PointStatus{}, nil
		}
		orgID = ""
	} else if isAllowedAll {
		// Super admin / Company: all or by org_id filter
		if orgIDFilter != "" {
			orgID = orgIDFilter
		}
	} else {
		// Manager: by org
		orgID = user.OrgID
	}

	// 1. Get all managed points (Union of owned points and shared points)
	var ownedPoints = make([]models.InundationStation, 0)
	var err error

	if orgID != "" {
		err = s.inundationStationRepo.R_SelectMany(ctx, bson.M{
			"active": true,
			"$or": []bson.M{
				{"org_id": orgID},
				{"shared_org_ids": orgID},
				{"share_all": true},
			},
		}, &ownedPoints)
	} else if orgID == "" && len(pointIDs) == 0 {
		ownedPoints, err = s.inundationStationRepo.ListByOrg(ctx, "")
	}

	if err != nil {
		return nil, err
	}

	allPointsMap := make(map[string]models.InundationStation)
	for _, p := range ownedPoints {
		allPointsMap[p.ID] = p
	}

	// Batch fetch employee assigned points instead of N individual GetByID calls
	if len(pointIDs) > 0 {
		var missingIDs []string
		for _, pid := range pointIDs {
			if _, exists := allPointsMap[pid]; !exists {
				missingIDs = append(missingIDs, pid)
			}
		}
		if len(missingIDs) > 0 {
			batchPoints, err := s.inundationStationRepo.GetByIDs(ctx, missingIDs)
			if err == nil {
				for _, p := range batchPoints {
					allPointsMap[p.ID] = p
				}
			}
		}
	}

	if len(allPointsMap) == 0 {
		return []PointStatus{}, nil
	}

	// Convert map back to slice for consistent processing
	finalPoints := make([]models.InundationStation, 0, len(allPointsMap))
	for _, p := range allPointsMap {
		finalPoints = append(finalPoints, p)
	}

	// 1.5 Get organization mapping
	orgs, _ := s.orgRepo.GetAll(ctx)
	orgMap := make(map[string]string)
	for _, o := range orgs {
		orgMap[o.ID] = o.Name
	}

	// 2. Batch fetch all LastReports in a single query instead of N individual GetByID calls
	var lastReportIDs []string
	for _, p := range finalPoints {
		if p.LastReportID != "" {
			lastReportIDs = append(lastReportIDs, p.LastReportID)
		}
	}

	lastReportMap := make(map[string]*models.InundationReport)
	if len(lastReportIDs) > 0 {
		batchReports, err := s.InundationReportRepo.GetByIDs(ctx, lastReportIDs)
		if err == nil {
			// fillReportBases for all reports in a single batch (1 history query instead of N)
			if len(batchReports) > 0 {
				_ = s.fillReportBases(ctx, batchReports...)
			}
			for _, r := range batchReports {
				lastReportMap[r.ID] = r
			}
		}
	}

	// 3. Use cached FloodLevel settings (auto-refresh with TTL, no per-request DB query)
	floodLevels := s.getFloodLevels(ctx)

	// 4. Build merged result
	result := make([]PointStatus, len(finalPoints))
	for i, p := range finalPoints {
		result[i] = PointStatus{
			InundationStation: p,
			Status:            "normal",
		}

		// Use pre-fetched LastReport from batch map
		if p.LastReportID != "" {
			if lastReport, ok := lastReportMap[p.LastReportID]; ok {
				// Use cached flood levels (pure in-memory calculation)
				level := calculateFloodLevelFromLevels(lastReport.Depth, floodLevels)
				if level != nil {
					lastReport.FloodLevelName = level.Name
					lastReport.FloodLevelColor = level.Color
				}
				result[i].LastReport = lastReport
			}
		}

		if p.ReportID != "" {
			result[i].Status = "flooded"
		} else {
			result[i].Status = "normal"
		}
		result[i].OrgName = orgMap[p.OrgID]
	}

	// Sort points
	sort.Slice(result, func(i, j int) bool {
		if result[i].ReportID != "" && result[j].ReportID == "" {
			return true
		}
		if result[i].ReportID == "" && result[j].ReportID != "" {
			return false
		}
		return result[i].Name < result[j].Name
	})

	return result, nil
}
func (s *service) UpdatePoint(ctx context.Context, id string, point *models.InundationStation) error {
	point.ID = id
	return s.inundationStationRepo.Update(ctx, point)
}
func (s *service) DeletePoint(ctx context.Context, id string) error {
	err := s.inundationStationRepo.Delete(ctx, id)
	if err != nil {
		return err
	}

	// Automatically pull this deleted point ID from all users' assigned list
	_, _ = s.userRepo.GetCollection().UpdateMany(ctx,
		bson.M{"assigned_inundation_station_ids": id},
		bson.M{"$pull": bson.M{"assigned_inundation_station_ids": id}},
	)

	return nil
}

func (s *service) touchStationLastFloodedTime(ctx context.Context, station *models.InundationStation) {
	if station == nil {
		return
	}
	station.LastFloodedTime = time.Now().Unix()
	_ = s.inundationStationRepo.Update(ctx, station)
}

func (s *service) ListPointsByOrg(ctx context.Context, orgID string) ([]models.InundationStation, error) {
	points, err := s.inundationStationRepo.ListByOrg(ctx, orgID)
	if err != nil {
		return nil, err
	}

	// Map OrgName
	orgs, _ := s.orgRepo.GetAll(ctx)
	orgMap := make(map[string]string)
	for _, o := range orgs {
		orgMap[o.ID] = o.Name
	}

	for i := range points {
		points[i].OrgName = orgMap[points[i].OrgID]
	}

	return points, nil
}
