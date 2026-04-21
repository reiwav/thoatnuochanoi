package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"sort"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) GetPointByID(ctx context.Context, id string) (*models.InundationStation, error) {
	return s.inundationStationRepo.GetByID(ctx, id)
}
func (s *service) CreatePoint(ctx context.Context, point models.InundationStation) (string, error) {
	if point.Active == false {
		point.Active = true
	}
	return s.inundationStationRepo.Create(ctx, point)
}
func (s *service) GetPointsStatus(ctx context.Context, user *models.User, isAllowedAll bool, orgIDFilter string) ([]PointStatus, error) {
	var orgID string
	var pointIDs []string

	if user.IsEmployee && !isAllowedAll {
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
	allPointsMap := make(map[string]models.InundationStation)
	var ownedPoints = make([]models.InundationStation, 0)
	var err error

	if orgID != "" {
		err = s.inundationStationRepo.R_SelectMany(ctx, bson.M{"$or": []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
			{"share_all": true},
		}}, &ownedPoints)
	} else if orgID == "" && len(pointIDs) == 0 {
		ownedPoints, err = s.inundationStationRepo.ListByOrg(ctx, "")
	}

	if len(pointIDs) > 0 {
		for _, pid := range pointIDs {
			if _, exists := allPointsMap[pid]; !exists {
				p, err := s.inundationStationRepo.GetByID(ctx, pid)
				if err == nil && p != nil {
					ownedPoints = append(ownedPoints, *p)
				}
			}
		}
	}

	if err != nil {
		return nil, err
	}
	for _, p := range ownedPoints {
		allPointsMap[p.ID] = p
	}
	pIDs := make([]string, 0)
	points := make([]models.InundationStation, 0, len(allPointsMap))
	for _, p := range allPointsMap {
		points = append(points, p)
		pIDs = append(pIDs, p.ID)
	}

	if len(points) == 0 {
		return []PointStatus{}, nil
	}

	// 1.5 Get organization mapping
	orgs, _, _ := s.orgRepo.List(ctx, filter.NewPaginationFilter())
	orgMap := make(map[string]string)
	for _, o := range orgs {
		orgMap[o.ID] = o.Name
	}

	// 2. Get active reports
	var activeReports []*models.InundationReport
	err = s.InundationReportRepo.R_SelectMany(ctx, bson.M{"status": "active", "point_id": bson.M{"$in": pIDs}}, &activeReports)
	if len(activeReports) == 0 {
		activeReports = make([]*models.InundationReport, 0)
	}

	// 3. Map reports to points
	reportsByPoint := make(map[string]*models.InundationReport)
	for _, r := range activeReports {
		if r.PointID != "" {
			reportsByPoint[r.PointID] = r
		}
	}

	// 4. Build merged result
	result := make([]PointStatus, len(points))
	for i, p := range points {
		var lastReport *models.InundationReport
		if p.LastReportID != "" {
			lastReport, _ = s.InundationReportRepo.GetByID(ctx, p.LastReportID)
		}

		active := reportsByPoint[p.ID]
		if active != nil {
			p.ReportID = active.ID
		} else {
			p.ReportID = ""
		}

		result[i] = PointStatus{
			InundationStation: p,
			Status:            "normal",
			LastReport:        lastReport,
		}
		if active != nil {
			result[i].Status = "flooded"
			result[i].ActiveReport = active
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
func (s *service) UpdatePoint(ctx context.Context, id string, point models.InundationStation) error {
	point.ID = id
	return s.inundationStationRepo.Update(ctx, point)
}
func (s *service) DeletePoint(ctx context.Context, id string) error {
	return s.inundationStationRepo.Delete(ctx, id)
}
