package report

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/internal/utils"
	"context"
	"fmt"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func formatWaterVal(val float64) string {
	if val <= 0 {
		return "-"
	}
	if val > 50 {
		return fmt.Sprintf("%.2f", val/100.0)
	}
	return fmt.Sprintf("%.2f", val)
}

func formatWaterDiff(rawBefore, rawHT float64) string {
	if rawBefore <= 0 || rawHT <= 0 {
		return "-"
	}
	mBefore := rawBefore
	if mBefore > 50 {
		mBefore = mBefore / 100.0
	}
	mHT := rawHT
	if mHT > 50 {
		mHT = mHT / 100.0
	}
	diff := mHT - mBefore
	if diff > 0 {
		return fmt.Sprintf("+%.2f", diff)
	} else if diff < 0 {
		return fmt.Sprintf("%.2f", diff)
	}
	return "0.00"
}

type waterReportTables struct {
	RiverDataRaw    [][]string
	LakeDataRaw     [][]string
	AllRiverDataRaw [][]string
	AllLakeDataRaw  [][]string
}

func (s *service) buildWaterStationTables(
	ctx context.Context,
	city *googleapi.CityStatus,
	rainStartTime time.Time,
	nowInLoc time.Time,
	loc *time.Location,
) waterReportTables {
	timeHeader := fmt.Sprintf("Thời điểm %s (m)", nowInLoc.Format("15h04"))
	lakeDataRaw := [][]string{{"STT", "Điểm đo", "Tại", "Trước mưa (m)", timeHeader}}
	riverDataRaw := [][]string{{"STT", "Điểm đo", "Tại", "Trước mưa (m)", timeHeader}}
	allRiverDataRaw := [][]string{{"STT", "Điểm đo", "Tại", "Trước mưa (m)", timeHeader}}
	allLakeDataRaw := [][]string{{"STT", "Điểm đo", "Tại", "Trước mưa (m)", timeHeader}}

	res, err := s.GetWaterReportDataCore(ctx, city, rainStartTime, nowInLoc, loc)
	if err == nil && res != nil {
		// All rivers
		for i, r := range res.Rivers {
			allRiverDataRaw = append(allRiverDataRaw, []string{
				fmt.Sprintf("%d", i+1),
				r.StationName,
				r.Address,
				r.BeforeRainValue,
				r.CurrentValue,
			})
		}
		// All lakes
		for i, l := range res.Lakes {
			allLakeDataRaw = append(allLakeDataRaw, []string{
				fmt.Sprintf("%d", i+1),
				l.StationName,
				l.Address,
				l.BeforeRainValue,
				l.CurrentValue,
			})
		}

		// Top 5 Rivers
		topRivers := append([]WaterReportDetail(nil), res.Rivers...)
		sort.SliceStable(topRivers, func(i, j int) bool {
			return topRivers[i].Priority > topRivers[j].Priority
		})
		count := 0
		for _, r := range topRivers {
			if r.Priority > 0 {
				count++
				riverDataRaw = append(riverDataRaw, []string{
					fmt.Sprintf("%d", count),
					r.StationName,
					r.Address,
					r.BeforeRainValue,
					r.CurrentValue,
				})
				if count >= 5 {
					break
				}
			}
		}

		// Top 5 Lakes
		topLakes := append([]WaterReportDetail(nil), res.Lakes...)
		sort.SliceStable(topLakes, func(i, j int) bool {
			return topLakes[i].Priority > topLakes[j].Priority
		})
		count = 0
		for _, l := range topLakes {
			if l.Priority > 0 {
				count++
				lakeDataRaw = append(lakeDataRaw, []string{
					fmt.Sprintf("%d", count),
					l.StationName,
					l.Address,
					l.BeforeRainValue,
					l.CurrentValue,
				})
				if count >= 5 {
					break
				}
			}
		}
	}

	return waterReportTables{
		RiverDataRaw:    riverDataRaw,
		LakeDataRaw:     lakeDataRaw,
		AllRiverDataRaw: allRiverDataRaw,
		AllLakeDataRaw:  allLakeDataRaw,
	}
}

func (s *service) GetWaterReportDetails(ctx context.Context) (*WaterReportDetailResponse, error) {
	city, err := s.googleSvc.GetCityStatus(ctx)
	if err != nil {
		return nil, err
	}

	nowInLoc := time.Now().In(time.Local) // Adjust location appropriately
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	if loc != nil {
		nowInLoc = time.Now().In(loc)
	}

	var rainStartTime time.Time
	if city.Weather != nil && !city.Weather.StartTimeFull.IsZero() {
		rainStartTime = city.Weather.StartTimeFull.In(loc)
	} else {
		rainStartTime = time.Date(nowInLoc.Year(), nowInLoc.Month(), nowInLoc.Day(), 7, 0, 0, 0, loc)
	}

	return s.GetWaterReportDataCore(ctx, city, rainStartTime, nowInLoc, loc)
}

func (s *service) GetWaterReportDataCore(
	ctx context.Context,
	city *googleapi.CityStatus,
	rainStartTime time.Time,
	nowInLoc time.Time,
	loc *time.Location,
) (*WaterReportDetailResponse, error) {
	actualRainStartTime := rainStartTime
	if city.Weather != nil && len(city.Weather.Measurements) > 0 {
		var earliestRain time.Time
		for _, m := range city.Weather.Measurements {
			if (m.TotalRain > 0 || m.SessionRain > 0) && !m.StartTimeFull.IsZero() {
				if earliestRain.IsZero() || m.StartTimeFull.Before(earliestRain) {
					earliestRain = m.StartTimeFull
				}
			}
		}
		if !earliestRain.IsZero() {
			actualRainStartTime = earliestRain.In(loc)
		}
	}

	rainDateStr := utils.GetRainDate(actualRainStartTime)
	parsedRainDate, _ := time.ParseInLocation("2006-01-02", rainDateStr, loc)
	rainStartOfDay := time.Date(parsedRainDate.Year(), parsedRainDate.Month(), parsedRainDate.Day(), 0, 0, 0, 0, loc)
	todayStartOfDay := time.Date(nowInLoc.Year(), nowInLoc.Month(), nowInLoc.Day(), 0, 0, 0, 0, loc)
	beforeRainEnd := actualRainStartTime.Add(-1 * time.Second)
	todayStr := nowInLoc.Format("2006-01-02")

	var allRivers []*models.RiverStation
	_ = s.riverStationRepo.R_SelectManyWithSort(ctx, bson.M{}, bson.M{"ten_tram": 1}, &allRivers)

	var allLakes []*models.LakeStation
	_ = s.lakeStationRepo.R_SelectManyWithSort(ctx, bson.M{}, bson.M{"ten_tram": 1}, &allLakes)

	wMap7 := make(map[int]float64)
	wMap13 := make(map[int]float64)
	wMapHT := make(map[int]float64)

	if city.RawWater != nil {
		for _, d := range city.RawWater.Content.Data {
			idInt := 0
			fmt.Sscanf(d.TramId, "%d", &idInt)
			wMap7[idInt] = d.ThuongLuu_7
			wMap13[idInt] = d.ThuongLuu_13
			wMapHT[idInt] = d.ThuongLuu_HT
		}
	}

	addrMap := make(map[int]string)
	nameAddrMap := make(map[string]string)
	for _, r := range allRivers {
		if r != nil && r.DiaChi != "" {
			addrMap[r.OldID] = r.DiaChi
			nameAddrMap[r.TenTram] = r.DiaChi
		}
	}
	for _, l := range allLakes {
		if l != nil && l.DiaChi != "" {
			addrMap[l.OldID] = l.DiaChi
			nameAddrMap[l.TenTram] = l.DiaChi
		}
	}
	getStationAddrRaw := func(oldID int, name string) string {
		if addr, ok := addrMap[oldID]; ok && addr != "" {
			return addr
		}
		if addr, ok := nameAddrMap[name]; ok && addr != "" {
			return addr
		}
		return "Chưa cập nhật"
	}

	response := &WaterReportDetailResponse{
		ReportTime: nowInLoc.Format("15:04 02/01/2006"),
		RainTime:   actualRainStartTime.Format("15:04 02/01/2006"),
		Rivers:     []WaterReportDetail{},
		Lakes:      []WaterReportDetail{},
	}

	for _, r := range allRivers {
		if r == nil {
			continue
		}
		detail := WaterReportDetail{
			StationName: r.TenTram,
			Address:     getStationAddrRaw(r.OldID, r.TenTram),
			Type:        "river",
			OldID:       r.OldID,
			Priority:    r.TrongSoBaoCao,
		}

		// Before Rain
		if s.riverRepo != nil && r.OldID > 0 {
			rec, err := s.riverRepo.GetLatestBefore(ctx, int64(r.OldID), rainStartOfDay, beforeRainEnd)
			if err == nil && rec != nil {
				detail.RawBeforeRain = rec.Value
				detail.BeforeRainTime = rec.Timestamp.In(loc).Format("15:04 02/01")
			}
		}
		if detail.RawBeforeRain <= 0 {
			if val, ok := wMap7[r.OldID]; ok && val > 0 {
				detail.RawBeforeRain = val
				detail.BeforeRainTime = "07:00"
			} else if val, ok := wMap13[r.OldID]; ok && val > 0 {
				detail.RawBeforeRain = val
				detail.BeforeRainTime = "13:00"
			}
		}
		detail.BeforeRainValue = formatWaterVal(detail.RawBeforeRain)

		// Current
		if s.riverRepo != nil && r.OldID > 0 {
			if latest, err := s.riverRepo.GetLatest(ctx, int64(r.OldID)); err == nil && latest != nil && latest.Value > 0 {
				if latest.Date == todayStr || latest.Timestamp.After(todayStartOfDay) {
					detail.RawCurrent = latest.Value
					detail.CurrentTime = latest.Timestamp.In(loc).Format("15:04 02/01")
				}
			}
		}
		if detail.RawCurrent <= 0 {
			if val, ok := wMapHT[r.OldID]; ok && val > 0 {
				detail.RawCurrent = val
				detail.CurrentTime = "HT"
			}
		}
		detail.CurrentValue = formatWaterVal(detail.RawCurrent)
		detail.Difference = formatWaterDiff(detail.RawBeforeRain, detail.RawCurrent)

		response.Rivers = append(response.Rivers, detail)
	}

	for _, l := range allLakes {
		if l == nil {
			continue
		}
		detail := WaterReportDetail{
			StationName: l.TenTram,
			Address:     getStationAddrRaw(l.OldID, l.TenTram),
			Type:        "lake",
			OldID:       l.OldID,
			Priority:    l.TrongSoBaoCao,
		}

		// Before Rain
		if s.lakeRepo != nil && l.OldID > 0 {
			rec, err := s.lakeRepo.GetLatestBefore(ctx, int64(l.OldID), rainStartOfDay, beforeRainEnd)
			if err == nil && rec != nil {
				detail.RawBeforeRain = rec.Value
				detail.BeforeRainTime = rec.Timestamp.In(loc).Format("15:04 02/01")
			}
		}
		if detail.RawBeforeRain <= 0 {
			if val, ok := wMap7[l.OldID]; ok && val > 0 {
				detail.RawBeforeRain = val
				detail.BeforeRainTime = "07:00"
			} else if val, ok := wMap13[l.OldID]; ok && val > 0 {
				detail.RawBeforeRain = val
				detail.BeforeRainTime = "13:00"
			}
		}
		detail.BeforeRainValue = formatWaterVal(detail.RawBeforeRain)

		// Current
		if s.lakeRepo != nil && l.OldID > 0 {
			if latest, err := s.lakeRepo.GetLatest(ctx, int64(l.OldID)); err == nil && latest != nil && latest.Value > 0 {
				if latest.Date == todayStr || latest.Timestamp.After(todayStartOfDay) {
					detail.RawCurrent = latest.Value
					detail.CurrentTime = latest.Timestamp.In(loc).Format("15:04 02/01")
				}
			}
		}
		if detail.RawCurrent <= 0 {
			if val, ok := wMapHT[l.OldID]; ok && val > 0 {
				detail.RawCurrent = val
				detail.CurrentTime = "HT"
			}
		}
		detail.CurrentValue = formatWaterVal(detail.RawCurrent)
		detail.Difference = formatWaterDiff(detail.RawBeforeRain, detail.RawCurrent)

		response.Lakes = append(response.Lakes, detail)
	}

	return response, nil
}
