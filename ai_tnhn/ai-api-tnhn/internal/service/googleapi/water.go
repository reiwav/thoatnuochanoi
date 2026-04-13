package googleapi

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"context"
	"fmt"
	"go.mongodb.org/mongo-driver/bson"
)

type WaterStationStat struct {
	Name     string  `json:"name"`
	Level    float64 `json:"level"`
	Label    string  `json:"label"` // E.g., "Hồ", "Sông"
	ThoiGian string  `json:"thoi_gian"`
}

type WaterSummaryData struct {
	TotalStations int                `json:"total_stations"`
	LakeStations  []WaterStationStat `json:"lake_stations"`
	RiverStations []WaterStationStat `json:"river_stations"`
}

func (s *service) getPermittedWaterStations(ctx context.Context, orgID string) (map[string]bool, error) {
	if s.stationSvc == nil {
		return nil, fmt.Errorf("stationSvc is not initialized")
	}

	f := filter.NewBasicFilter()
	if orgID != "" && orgID != "all" {
		f.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
		})
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

func (s *service) GetWaterSummary(ctx context.Context, orgID string) (*WaterSummaryData, error) {
	waterData, err := s.weatherSvc.GetRawWaterData(ctx)
	if err != nil {
		fmt.Printf(" [GoogleAPI] Water API Error: %v\n", err)
		return nil, err
	}

	permitted, err := s.getPermittedWaterStations(ctx, orgID)
	if err != nil {
		return nil, err
	}

	stationMap := make(map[string]struct {
		Name string
		Loai string
	})
	for _, t := range waterData.Content.Tram {
		if orgID != "" && orgID != "all" && !permitted[t.Id] {
			continue // Skip stations not permitted
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

	return &WaterSummaryData{
		TotalStations: len(waterData.Content.Tram),
		LakeStations:  lakes,
		RiverStations: rivers,
	}, nil
}
