package water

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type PermittedStation struct {
	Priority         int
	Address          string
	ThresholdConfigs []models.StationThresholdConfig
}

func (s *service) getPermittedWaterStations(ctx context.Context, orgID string, assignedIDs []string) (map[string]PermittedStation, error) {
	if s.stationSvc == nil {
		return nil, fmt.Errorf("stationSvc is not initialized")
	}

	f := filter.NewBasicFilter()
	if orgID != "" {
		f.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
			{"share_all": true},
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

	permitted := make(map[string]PermittedStation)
	for _, st := range lakeStations {
		if st.OldID > 0 {
			permitted[fmt.Sprintf("%d", st.OldID)] = PermittedStation{
				Priority:         st.TrongSoBaoCao,
				Address:          st.DiaChi,
				ThresholdConfigs: st.ThresholdConfigs,
			}
		}
	}
	for _, st := range riverStations {
		if st.OldID > 0 {
			permitted[fmt.Sprintf("%d", st.OldID)] = PermittedStation{
				Priority:         st.TrongSoBaoCao,
				Address:          st.DiaChi,
				ThresholdConfigs: st.ThresholdConfigs,
			}
		}
	}
	return permitted, nil
}

func (s *service) GetWaterSummary(ctx context.Context, orgID string, assignedIDs []string) (*WaterSummaryData, error) {
	todayStr := time.Now().Format("2006-01-02")
	now := time.Now()

	// 1. Get permitted DB stations for Lake & River
	f := filter.NewBasicFilter()
	if orgID != "" {
		f.AddWhere("org_id_or_shared", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
			{"share_all": true},
		})
	}
	if len(assignedIDs) > 0 {
		f.AddWhere("id_in", "_id", bson.M{"$in": assignedIDs})
	}

	lakeStations, _, _ := s.stationSvc.ListLakeStations(ctx, f)
	riverStations, _, _ := s.stationSvc.ListRiverStations(ctx, f)

	// 2. Fetch today's records from MongoDB (saved by staff grid or auto worker)
	todayLakeRecs, _ := s.lakeRepo.GetByDate(ctx, todayStr)
	todayRiverRecs, _ := s.riverRepo.GetByDate(ctx, todayStr)

	// Map latest record by station OldID
	latestLakeRecMap := make(map[int64]*models.LakeRecord)
	for _, r := range todayLakeRecs {
		if existing, ok := latestLakeRecMap[r.StationID]; !ok || r.Timestamp.After(existing.Timestamp) {
			latestLakeRecMap[r.StationID] = r
		}
	}

	latestRiverRecMap := make(map[int64]*models.RiverRecord)
	for _, r := range todayRiverRecs {
		if existing, ok := latestRiverRecMap[r.StationID]; !ok || r.Timestamp.After(existing.Timestamp) {
			latestRiverRecMap[r.StationID] = r
		}
	}

	var lakes []WaterStationStat
	for _, st := range lakeStations {
		if !st.Active {
			continue
		}

		rec, hasDBRec := latestLakeRecMap[int64(st.OldID)]
		if !hasDBRec {
			lakes = append(lakes, WaterStationStat{
				Name:            st.TenTram,
				Level:           0,
				Label:           "Hồ",
				ThoiGian:        "-",
				Priority:        st.TrongSoBaoCao,
				Address:         st.DiaChi,
				ThresholdStatus: "no_data",
				StatusText:      "Chưa có dữ liệu",
				IsExceeded:      false,
				HasData:         false,
			})
			continue
		}

		valInMeters := rec.Value

		timeStr := rec.Timestamp.Format("15:04")
		status := ""
		minVal := rec.MinThreshold
		maxVal := rec.MaxThreshold
		var statusText string
		var isExceeded bool

		if s.waterThresholdSvc != nil && len(st.ThresholdConfigs) > 0 {
			status, minVal, maxVal = s.waterThresholdSvc.CalculateThresholdStatus(ctx, now, st.ThresholdConfigs, valInMeters)
		} else {
			status = rec.ThresholdStatus
		}

		if status == "high" {
			statusText = "Vượt ngưỡng cao"
			isExceeded = true
		} else if status == "low" {
			statusText = "Dưới ngưỡng thấp"
			isExceeded = true
		} else {
			statusText = "Bình thường"
			status = "normal"
		}

		lakes = append(lakes, WaterStationStat{
			Name:            st.TenTram,
			Level:           valInMeters,
			Label:           "Hồ",
			ThoiGian:        timeStr,
			Priority:        st.TrongSoBaoCao,
			Address:         st.DiaChi,
			ThresholdStatus: status,
			StatusText:      statusText,
			IsExceeded:      isExceeded,
			HasData:         true,
			MinThreshold:    minVal,
			MaxThreshold:    maxVal,
		})
	}

	var rivers []WaterStationStat
	for _, st := range riverStations {
		if !st.Active {
			continue
		}

		rec, hasDBRec := latestRiverRecMap[int64(st.OldID)]
		if !hasDBRec {
			rivers = append(rivers, WaterStationStat{
				Name:            st.TenTram,
				Level:           0,
				Label:           "Sông",
				ThoiGian:        "-",
				Priority:        st.TrongSoBaoCao,
				Address:         st.DiaChi,
				ThresholdStatus: "no_data",
				StatusText:      "Chưa có dữ liệu",
				IsExceeded:      false,
				HasData:         false,
			})
			continue
		}

		valInMeters := rec.Value

		timeStr := rec.Timestamp.Format("15:04")
		status := ""
		minVal := rec.MinThreshold
		maxVal := rec.MaxThreshold
		var statusText string
		var isExceeded bool

		if s.waterThresholdSvc != nil && len(st.ThresholdConfigs) > 0 {
			status, minVal, maxVal = s.waterThresholdSvc.CalculateThresholdStatus(ctx, now, st.ThresholdConfigs, valInMeters)
		} else {
			status = rec.ThresholdStatus
		}

		if status == "high" {
			statusText = "Vượt ngưỡng cao"
			isExceeded = true
		} else if status == "low" {
			statusText = "Dưới ngưỡng thấp"
			isExceeded = true
		} else {
			statusText = "Bình thường"
			status = "normal"
		}

		rivers = append(rivers, WaterStationStat{
			Name:            st.TenTram,
			Level:           valInMeters,
			Label:           "Sông",
			ThoiGian:        timeStr,
			Priority:        st.TrongSoBaoCao,
			Address:         st.DiaChi,
			ThresholdStatus: status,
			StatusText:      statusText,
			IsExceeded:      isExceeded,
			HasData:         true,
			MinThreshold:    minVal,
			MaxThreshold:    maxVal,
		})
	}

	sort.Slice(lakes, func(i, j int) bool {
		return lakes[i].Name < lakes[j].Name
	})
	sort.Slice(rivers, func(i, j int) bool {
		return rivers[i].Name < rivers[j].Name
	})

	var riverSummaryStr, lakeSummaryStr string
	var summaryParts []string

	if len(rivers) > 0 {
		var riverLines []string
		for _, r := range rivers {
			if !r.HasData {
				riverLines = append(riverLines, fmt.Sprintf("- %s: Chưa có dữ liệu", r.Name))
				continue
			}
			line := fmt.Sprintf("- %s: %.2f", r.Name, r.Level)
			if r.IsExceeded {
				line += fmt.Sprintf(" (%s", r.StatusText)
				if r.ThresholdStatus == "high" && r.MaxThreshold > 0 {
					line += fmt.Sprintf(": %.2f > Ngưỡng cao %.2f", r.Level, r.MaxThreshold)
				} else if r.ThresholdStatus == "low" && r.MinThreshold > 0 {
					line += fmt.Sprintf(": %.2f < Ngưỡng thấp %.2f", r.Level, r.MinThreshold)
				}
				line += ")"
			}
			riverLines = append(riverLines, line)
		}
		riverSummaryStr = strings.Join(riverLines, "\n")
		summaryParts = append(summaryParts, "Sông:\n"+riverSummaryStr)
	} else {
		riverSummaryStr = "Hiện tại không ghi nhận dữ liệu mực nước tại các trạm sông."
	}

	if len(lakes) > 0 {
		var lakeLines []string
		for _, l := range lakes {
			if !l.HasData {
				lakeLines = append(lakeLines, fmt.Sprintf("- %s: Chưa có dữ liệu", l.Name))
				continue
			}
			line := fmt.Sprintf("- %s: %.2f", l.Name, l.Level)
			if l.IsExceeded {
				line += fmt.Sprintf(" (%s", l.StatusText)
				if l.ThresholdStatus == "high" && l.MaxThreshold > 0 {
					line += fmt.Sprintf(": %.2f > Ngưỡng cao %.2f", l.Level, l.MaxThreshold)
				} else if l.ThresholdStatus == "low" && l.MinThreshold > 0 {
					line += fmt.Sprintf(": %.2f < Ngưỡng thấp %.2f", l.Level, l.MinThreshold)
				}
				line += ")"
			}
			lakeLines = append(lakeLines, line)
		}
		lakeSummaryStr = strings.Join(lakeLines, "\n")
		summaryParts = append(summaryParts, "Hồ:\n"+lakeSummaryStr)
	} else {
		lakeSummaryStr = "Hiện tại không ghi nhận dữ liệu mực nước tại các trạm hồ."
	}

	return &WaterSummaryData{
		TotalStations: len(lakes) + len(rivers),
		LakeStations:  lakes,
		RiverStations: rivers,
		SummaryText:   strings.Join(summaryParts, "\n\n"),
		RiverSummary:  riverSummaryStr,
		LakeSummary:   lakeSummaryStr,
	}, nil
}
