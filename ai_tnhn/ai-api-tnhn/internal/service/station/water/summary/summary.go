package summary

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/service/station/water/dto"
	"ai-api-tnhn/utils"
	"context"
	"sort"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) GetWaterSummary(ctx context.Context, orgID string, assignedIDs []string) (*dto.WaterSummaryData, error) {
	now := utils.NowVietnam()
	todayStr := utils.TodayVietnam()

	// 1. Build filter & fetch permitted DB stations for Lake & River
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
	latestLakeRecMap := make(map[int64]*dto.WaterRecordInfo)
	for _, r := range todayLakeRecs {
		if existing, ok := latestLakeRecMap[r.StationID]; !ok || r.Timestamp.After(existing.Timestamp) {
			latestLakeRecMap[r.StationID] = &dto.WaterRecordInfo{
				Value:           r.Value,
				Timestamp:       r.Timestamp,
				MinThreshold:    r.MinThreshold,
				MaxThreshold:    r.MaxThreshold,
				ThresholdStatus: r.ThresholdStatus,
			}
		}
	}

	latestRiverRecMap := make(map[int64]*dto.WaterRecordInfo)
	for _, r := range todayRiverRecs {
		if existing, ok := latestRiverRecMap[r.StationID]; !ok || r.Timestamp.After(existing.Timestamp) {
			latestRiverRecMap[r.StationID] = &dto.WaterRecordInfo{
				Value:           r.Value,
				Timestamp:       r.Timestamp,
				MinThreshold:    r.MinThreshold,
				MaxThreshold:    r.MaxThreshold,
				ThresholdStatus: r.ThresholdStatus,
			}
		}
	}

	// 3. Build statistics for Lake stations
	var lakes []dto.WaterStationStat
	for _, st := range lakeStations {
		if !st.Active {
			continue
		}
		rec := latestLakeRecMap[int64(st.OldID)]
		lakes = append(lakes, buildStationStat(
			ctx, now, "Hồ", st.TenTram, st.TrongSoBaoCao, st.DiaChi,
			st.ThresholdConfigs, rec, s.waterThresholdSvc,
		))
	}

	// 4. Build statistics for River stations
	var rivers []dto.WaterStationStat
	for _, st := range riverStations {
		if !st.Active {
			continue
		}
		rec := latestRiverRecMap[int64(st.OldID)]
		rivers = append(rivers, buildStationStat(
			ctx, now, "Sông", st.TenTram, st.TrongSoBaoCao, st.DiaChi,
			st.ThresholdConfigs, rec, s.waterThresholdSvc,
		))
	}

	// 5. Sort alphabetically by station name
	sort.Slice(lakes, func(i, j int) bool { return lakes[i].Name < lakes[j].Name })
	sort.Slice(rivers, func(i, j int) bool { return rivers[i].Name < rivers[j].Name })

	// 6. Generate summary text sections
	riverSummaryStr, riverSection := formatCategorySummary(
		rivers, "Sông", "Hiện tại không ghi nhận dữ liệu mực nước tại các trạm sông.",
	)
	lakeSummaryStr, lakeSection := formatCategorySummary(
		lakes, "Hồ", "Hiện tại không ghi nhận dữ liệu mực nước tại các trạm hồ.",
	)

	var summaryParts []string
	if riverSection != "" {
		summaryParts = append(summaryParts, riverSection)
	}
	if lakeSection != "" {
		summaryParts = append(summaryParts, lakeSection)
	}

	return &dto.WaterSummaryData{
		TotalStations: len(lakes) + len(rivers),
		LakeStations:  lakes,
		RiverStations: rivers,
		SummaryText:   strings.Join(summaryParts, "\n\n"),
		RiverSummary:  riverSummaryStr,
		LakeSummary:   lakeSummaryStr,
	}, nil
}
