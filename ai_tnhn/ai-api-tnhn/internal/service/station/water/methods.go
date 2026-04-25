package water

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"sort"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) GetRainDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RainRecord, error) {
	return s.rainRepo.GetByStationID(ctx, stationID, limit, date)
}

func (s *service) GetLakeDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.LakeRecord, error) {
	return s.lakeRepo.GetByStationID(ctx, stationID, limit, date)
}

func (s *service) GetRiverDataByStation(ctx context.Context, stationID int64, limit int64, date string) ([]*models.RiverRecord, error) {
	return s.riverRepo.GetByStationID(ctx, stationID, limit, date)
}

func (s *service) GetRainDataByDate(ctx context.Context, date string) ([]*models.RainRecord, error) {
	return s.rainRepo.GetByDate(ctx, date)
}

func (s *service) GetLakeDataByDate(ctx context.Context, date string) ([]*models.LakeRecord, error) {
	return s.lakeRepo.GetByDate(ctx, date)
}

func (s *service) GetRiverDataByDate(ctx context.Context, date string) ([]*models.RiverRecord, error) {
	return s.riverRepo.GetByDate(ctx, date)
}

func (s *service) GetRainAggregateStats(ctx context.Context, stationID int64, startDate, endDate string, groupBy string) ([]map[string]interface{}, error) {
	filter := bson.M{}
	if stationID > 0 {
		filter["station_id"] = stationID
	}
	if startDate != "" || endDate != "" {
		dateFilter := bson.M{}
		if startDate != "" {
			dateFilter["$gte"] = startDate
		}
		if endDate != "" {
			dateFilter["$lte"] = endDate
		}
		filter["date"] = dateFilter
	}

	return s.rainRepo.GetAggregateStats(ctx, filter, groupBy)
}

func (s *service) getPermittedWaterStations(ctx context.Context, orgID string, assignedIDs []string) (map[string]bool, error) {
	if s.stationSvc == nil {
		return nil, fmt.Errorf("stationSvc is not initialized")
	}

	f := filter.NewBasicFilter()
	if orgID != "" {
		f.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
		})
	}

	if len(assignedIDs) > 0 {
		f.AddWhere("id_in", "_id", bson.M{"$in": assignedIDs})
	}

	lakeStations, _, err := s.stationSvc.ListLakeStations(ctx, f)
	if err != nil {
		return nil, err
	}
	riverStations, _, err := s.stationSvc.ListRiverStations(ctx, f)
	if err != nil {
		return nil, err
	}

	permitted := make(map[string]bool)
	for _, st := range lakeStations {
		if st.OldID > 0 {
			permitted[fmt.Sprintf("%d", st.OldID)] = true
		}
	}
	for _, st := range riverStations {
		if st.OldID > 0 {
			permitted[fmt.Sprintf("%d", st.OldID)] = true
		}
	}
	return permitted, nil
}

func (s *service) GetWaterSummary(ctx context.Context, orgID string, assignedIDs []string) (*WaterSummaryData, error) {
	waterData, err := s.weatherSvc.GetRawWaterData(ctx)
	if err != nil {
		return nil, err
	}

	permitted, err := s.getPermittedWaterStations(ctx, orgID, assignedIDs)
	if err != nil {
		return nil, err
	}

	stationMap := make(map[string]struct {
		Name string
		Loai string
	})
	for _, t := range waterData.Content.Tram {
		if orgID != "" && !permitted[t.Id] {
			continue
		}
		stationMap[t.Id] = struct {
			Name string
			Loai string
		}{Name: t.TenTram, Loai: t.Loai}
	}

	var lakes, rivers []WaterStationStat
	for _, d := range waterData.Content.Data {
		info, ok := stationMap[d.TramId]
		if !ok {
			continue
		}
		timeStr := d.ThoiGian_HT
		if len(timeStr) > 16 {
			timeStr = timeStr[11:16]
		}
		stat := WaterStationStat{
			Name:     info.Name,
			Level:    d.ThuongLuu_HT,
			ThoiGian: timeStr,
		}
		if info.Loai == "2" {
			stat.Label = "Hồ"
			lakes = append(lakes, stat)
		} else {
			stat.Label = "Sông"
			rivers = append(rivers, stat)
		}
	}

	sort.Slice(lakes, func(i, j int) bool {
		return lakes[i].Name < lakes[j].Name
	})
	sort.Slice(rivers, func(i, j int) bool {
		return rivers[i].Name < rivers[j].Name
	})

	var summaryParts []string
	if len(lakes) > 0 {
		var lakeLines []string
		for _, l := range lakes {
			lakeLines = append(lakeLines, fmt.Sprintf("- %s: %.2fm", l.Name, l.Level/100.0))
		}
		summaryParts = append(summaryParts, "Hồ:\n"+strings.Join(lakeLines, "\n"))
	}
	if len(rivers) > 0 {
		var riverLines []string
		for _, r := range rivers {
			riverLines = append(riverLines, fmt.Sprintf("- %s: %.2fm", r.Name, r.Level/100.0))
		}
		summaryParts = append(summaryParts, "Sông:\n"+strings.Join(riverLines, "\n"))
	}

	return &WaterSummaryData{
		TotalStations: len(waterData.Content.Tram),
		LakeStations:  lakes,
		RiverStations: rivers,
		SummaryText:   strings.Join(summaryParts, "\n\n"),
	}, nil
}
