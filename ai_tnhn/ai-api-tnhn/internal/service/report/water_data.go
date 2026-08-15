package report

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/google/googleapi"
	"context"
	"fmt"
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
	lakeDataRaw := [][]string{{"Hồ", "Mực nước(m)"}}
	riverDataRaw := [][]string{{"Sông", "Mực nước(m)"}}

	// 1. Lấy và Map dữ liệu trạm Sông (Trọng số > 0, lấy 5 trạm cho báo cáo chính)
	var rivers []*models.RiverStation
	_ = s.riverStationRepo.R_SelectManyWithSort(ctx, bson.M{"trong_so_bao_cao": bson.M{"$gt": 0}}, bson.M{"trong_so_bao_cao": -1}, &rivers)
	if len(rivers) > 5 {
		rivers = rivers[:5]
	}

	// 2. Lấy và Map dữ liệu trạm Hồ (Trọng số > 0, lấy 5 trạm cho báo cáo chính)
	var lakes []*models.LakeStation
	_ = s.lakeStationRepo.R_SelectManyWithSort(ctx, bson.M{"trong_so_bao_cao": bson.M{"$gt": 0}}, bson.M{"trong_so_bao_cao": -1}, &lakes)
	if len(lakes) > 5 {
		lakes = lakes[:5]
	}

	// Phụ lục: Lấy TẤT CẢ trạm Sông và Hồ
	var allRivers []*models.RiverStation
	_ = s.riverStationRepo.R_SelectManyWithSort(ctx, bson.M{}, bson.M{"trong_so_bao_cao": -1, "thu_tu": 1}, &allRivers)

	var allLakes []*models.LakeStation
	_ = s.lakeStationRepo.R_SelectManyWithSort(ctx, bson.M{}, bson.M{"trong_so_bao_cao": -1, "thu_tu": 1}, &allLakes)

	allRiverDataRaw := [][]string{{"Sông", "Trước mưa (m)", "Hiện tại (m)", "Chênh lệch (m)"}}
	allLakeDataRaw := [][]string{{"Hồ", "Trước mưa (m)", "Hiện tại (m)", "Chênh lệch (m)"}}

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

	todayStr := nowInLoc.Format("2006-01-02")
	startOfDay := time.Date(nowInLoc.Year(), nowInLoc.Month(), nowInLoc.Day(), 0, 0, 0, 0, loc)

	getRiverWaterBeforeRain := func(oldID int) float64 {
		if s.riverRepo != nil && oldID > 0 {
			recs, err := s.riverRepo.GetAllByStationID(ctx, int64(oldID), startOfDay, rainStartTime)
			if err == nil && len(recs) > 0 && recs[0].Value > 0 {
				return recs[0].Value
			}
		}
		if val, ok := wMap7[oldID]; ok && val > 0 {
			return val
		}
		if val, ok := wMap13[oldID]; ok && val > 0 {
			return val
		}
		return 0
	}

	getLakeWaterBeforeRain := func(oldID int) float64 {
		if s.lakeRepo != nil && oldID > 0 {
			recs, err := s.lakeRepo.GetAllByStationID(ctx, int64(oldID), startOfDay, rainStartTime)
			if err == nil && len(recs) > 0 && recs[0].Value > 0 {
				return recs[0].Value
			}
		}
		if val, ok := wMap7[oldID]; ok && val > 0 {
			return val
		}
		if val, ok := wMap13[oldID]; ok && val > 0 {
			return val
		}
		return 0
	}

	getRiverWaterCurrent := func(oldID int) float64 {
		if s.riverRepo != nil && oldID > 0 {
			if latest, err := s.riverRepo.GetLatest(ctx, int64(oldID)); err == nil && latest != nil && latest.Value > 0 {
				if latest.Date == todayStr || latest.Timestamp.After(startOfDay) {
					return latest.Value
				}
			}
		}
		if val, ok := wMapHT[oldID]; ok && val > 0 {
			return val
		}
		return 0
	}

	getLakeWaterCurrent := func(oldID int) float64 {
		if s.lakeRepo != nil && oldID > 0 {
			if latest, err := s.lakeRepo.GetLatest(ctx, int64(oldID)); err == nil && latest != nil && latest.Value > 0 {
				if latest.Date == todayStr || latest.Timestamp.After(startOfDay) {
					return latest.Value
				}
			}
		}
		if val, ok := wMapHT[oldID]; ok && val > 0 {
			return val
		}
		return 0
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
	for _, r := range rivers {
		if r != nil && r.DiaChi != "" {
			addrMap[r.OldID] = r.DiaChi
			nameAddrMap[r.TenTram] = r.DiaChi
		}
	}
	for _, l := range lakes {
		if l != nil && l.DiaChi != "" {
			addrMap[l.OldID] = l.DiaChi
			nameAddrMap[l.TenTram] = l.DiaChi
		}
	}

	getStationAddr := func(oldID int, name string) string {
		if addr, ok := addrMap[oldID]; ok && addr != "" {
			return " (" + addr + ")"
		}
		if addr, ok := nameAddrMap[name]; ok && addr != "" {
			return " (" + addr + ")"
		}
		return ""
	}

	// Báo cáo chính: Hiển thị 2 cột (Tên trạm, Mực nước hiện tại)
	if len(rivers) > 0 {
		for _, r := range rivers {
			valHT := formatWaterVal(getRiverWaterCurrent(r.OldID))
			riverDataRaw = append(riverDataRaw, []string{r.TenTram + getStationAddr(r.OldID, r.TenTram), valHT})
		}
	} else if city.RawWater != nil {
		count := 0
		for _, t := range city.RawWater.Content.Tram {
			if t.Loai == "1" {
				idInt := 0
				fmt.Sscanf(t.Id, "%d", &idInt)
				valHT := formatWaterVal(getRiverWaterCurrent(idInt))
				riverDataRaw = append(riverDataRaw, []string{t.TenTram + getStationAddr(idInt, t.TenTram), valHT})
				count++
				if count >= 5 {
					break
				}
			}
		}
	}

	if len(lakes) > 0 {
		for _, l := range lakes {
			valHT := formatWaterVal(getLakeWaterCurrent(l.OldID))
			lakeDataRaw = append(lakeDataRaw, []string{l.TenTram + getStationAddr(l.OldID, l.TenTram), valHT})
		}
	} else if city.RawWater != nil {
		count := 0
		for _, t := range city.RawWater.Content.Tram {
			if t.Loai == "2" {
				idInt := 0
				fmt.Sscanf(t.Id, "%d", &idInt)
				valHT := formatWaterVal(getLakeWaterCurrent(idInt))
				lakeDataRaw = append(lakeDataRaw, []string{t.TenTram + getStationAddr(idInt, t.TenTram), valHT})
				count++
				if count >= 5 {
					break
				}
			}
		}
	}

	// Phụ lục: Thống kê toàn bộ các trạm Sông và Hồ
	if len(allRivers) > 0 {
		for _, r := range allRivers {
			rawBefore := getRiverWaterBeforeRain(r.OldID)
			rawHT := getRiverWaterCurrent(r.OldID)
			valBefore := formatWaterVal(rawBefore)
			valHT := formatWaterVal(rawHT)
			valDiff := formatWaterDiff(rawBefore, rawHT)
			allRiverDataRaw = append(allRiverDataRaw, []string{r.TenTram + getStationAddr(r.OldID, r.TenTram), valBefore, valHT, valDiff})
		}
	} else if city.RawWater != nil {
		for _, t := range city.RawWater.Content.Tram {
			if t.Loai == "1" {
				idInt := 0
				fmt.Sscanf(t.Id, "%d", &idInt)
				rawBefore := getRiverWaterBeforeRain(idInt)
				rawHT := getRiverWaterCurrent(idInt)
				valBefore := formatWaterVal(rawBefore)
				valHT := formatWaterVal(rawHT)
				valDiff := formatWaterDiff(rawBefore, rawHT)
				allRiverDataRaw = append(allRiverDataRaw, []string{t.TenTram + getStationAddr(idInt, t.TenTram), valBefore, valHT, valDiff})
			}
		}
	}

	if len(allLakes) > 0 {
		for _, l := range allLakes {
			rawBefore := getLakeWaterBeforeRain(l.OldID)
			rawHT := getLakeWaterCurrent(l.OldID)
			valBefore := formatWaterVal(rawBefore)
			valHT := formatWaterVal(rawHT)
			valDiff := formatWaterDiff(rawBefore, rawHT)
			allLakeDataRaw = append(allLakeDataRaw, []string{l.TenTram + getStationAddr(l.OldID, l.TenTram), valBefore, valHT, valDiff})
		}
	} else if city.RawWater != nil {
		for _, t := range city.RawWater.Content.Tram {
			if t.Loai == "2" {
				idInt := 0
				fmt.Sscanf(t.Id, "%d", &idInt)
				rawBefore := getLakeWaterBeforeRain(idInt)
				rawHT := getLakeWaterCurrent(idInt)
				valBefore := formatWaterVal(rawBefore)
				valHT := formatWaterVal(rawHT)
				valDiff := formatWaterDiff(rawBefore, rawHT)
				allLakeDataRaw = append(allLakeDataRaw, []string{t.TenTram + getStationAddr(idInt, t.TenTram), valBefore, valHT, valDiff})
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
