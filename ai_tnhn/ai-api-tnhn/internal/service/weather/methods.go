package weather

import (
	"ai-api-tnhn/internal/utils"
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
)

func (s *service) GetRawRainData(ctx context.Context) (*RainDataResponse, error) {
	return s.thoatnuocSvc.GetRawRainData(ctx)
}

func (s *service) GetRawWaterData(ctx context.Context) (*WaterDataResponse, error) {
	source := "api" // default
	if s.settingSvc != nil {
		setting, err := s.settingSvc.GetWaterSourceSetting(ctx)
		if err == nil && setting != nil {
			source = setting.Source
		}
	}

	if source == "db" {
		lakeStations, err := s.stationSvc.GetAllLakeStations(ctx)
		if err != nil {
			return nil, err
		}
		riverStations, err := s.stationSvc.GetAllRiverStations(ctx)
		if err != nil {
			return nil, err
		}

		resp := &WaterDataResponse{}
		resp.Code = 200

		// Add lake stations
		for _, lake := range lakeStations {
			if !lake.Active || lake.OldID <= 0 {
				continue
			}
			resp.Content.Tram = append(resp.Content.Tram, struct {
				Id          string `json:"Id"`
				TenTram     string `json:"TenTram"`
				TenTramHTML string `json:"TenTramHTML"`
				Loai        string `json:"Loai"`
				ThuTu       int    `json:"ThuTu"`
			}{
				Id:      fmt.Sprintf("%d", lake.OldID),
				TenTram: lake.TenTram,
				Loai:    "2",
				ThuTu:   lake.ThuTu,
			})

			if lake.LatestRecord != nil {
				timeStr := lake.LatestRecord.Timestamp.Format("2006-01-02 15:04:05")
				resp.Content.Data = append(resp.Content.Data, struct {
					TramId       string  `json:"TramId"`
					ThuongLuu_7  float64 `json:"ThuongLuu_7"`
					ThuongLuu_13 float64 `json:"ThuongLuu_13"`
					ThuongLuu_HT float64 `json:"ThuongLuu_HT"`
					ThoiGian_HT  string  `json:"ThoiGian_HT"`
					Loai         int     `json:"Loai"`
				}{
					TramId:       fmt.Sprintf("%d", lake.OldID),
					ThuongLuu_7:  lake.LatestRecord.Value,
					ThuongLuu_13: lake.LatestRecord.Value,
					ThuongLuu_HT: lake.LatestRecord.Value,
					ThoiGian_HT:  timeStr,
					Loai:         2,
				})
			}
		}

		// Add river stations
		for _, river := range riverStations {
			if !river.Active || river.OldID <= 0 {
				continue
			}
			resp.Content.Tram = append(resp.Content.Tram, struct {
				Id          string `json:"Id"`
				TenTram     string `json:"TenTram"`
				TenTramHTML string `json:"TenTramHTML"`
				Loai        string `json:"Loai"`
				ThuTu       int    `json:"ThuTu"`
			}{
				Id:      fmt.Sprintf("%d", river.OldID),
				TenTram: river.TenTram,
				Loai:    "1",
				ThuTu:   river.ThuTu,
			})

			if river.LatestRecord != nil {
				timeStr := river.LatestRecord.Timestamp.Format("2006-01-02 15:04:05")
				resp.Content.Data = append(resp.Content.Data, struct {
					TramId       string  `json:"TramId"`
					ThuongLuu_7  float64 `json:"ThuongLuu_7"`
					ThuongLuu_13 float64 `json:"ThuongLuu_13"`
					ThuongLuu_HT float64 `json:"ThuongLuu_HT"`
					ThoiGian_HT  string  `json:"ThoiGian_HT"`
					Loai         int     `json:"Loai"`
				}{
					TramId:       fmt.Sprintf("%d", river.OldID),
					ThuongLuu_7:  river.LatestRecord.Value,
					ThuongLuu_13: river.LatestRecord.Value,
					ThuongLuu_HT: river.LatestRecord.Value,
					ThoiGian_HT:  timeStr,
					Loai:         1,
				})
			}
		}

		return resp, nil
	}

	return s.thoatnuocSvc.GetRawWaterData(ctx)
}

func (s *service) SetForecastFunc(fn ForecastFunc) {
	s.forecastFunc = fn
}

func (s *service) GetHistoricalRainData(ctx context.Context) (HistoricalRainData, error) {
	records, err := s.histRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	res := make(HistoricalRainData)
	for _, r := range records {
		if _, ok := res[r.Station]; !ok {
			res[r.Station] = make(map[string]float64)
		}
		res[r.Station][r.Date] = r.Rainfall
	}
	return res, nil
}

func (s *service) GetComparisonData(ctx context.Context, y1, y2 int) (interface{}, error) {
	totals, err := s.histRepo.GetMonthlyTotals(ctx, []int{y1, y2})
	if err != nil {
		return nil, err
	}
	data, stations := make(map[int]map[int]map[string]float64), make(map[string]bool)
	data[y1], data[y2] = make(map[int]map[string]float64), make(map[int]map[string]float64)
	for _, t := range totals {
		stations[t.Station] = true
		if _, ok := data[t.Year][t.Month]; !ok {
			data[t.Year][t.Month] = make(map[string]float64)
		}
		data[t.Year][t.Month][t.Station] = t.Total
	}
	annual := make(map[int]map[string]float64)
	annual[y1], annual[y2] = make(map[string]float64), make(map[string]float64)
	for y, ms := range data {
		for _, stM := range ms {
			for st, v := range stM {
				annual[y][st] += v
			}
		}
	}
	sList := []string{}
	for s := range stations {
		sList = append(sList, s)
	}
	return gin.H{"year1": y1, "year2": y2, "data": data, "annualTotals": annual, "stations": sList}, nil
}

func (s *service) GetForecast(ctx context.Context) (string, error) {
	now := time.Now().In(utils.VietnamTZ)
	if s.forecast != "" && s.lastFetch.Year() == now.Year() && s.lastFetch.Day() == now.Day() {
		return s.forecast, nil
	}
	data, err := s.forecastSvc.GetHanoiForecast(ctx)
	if err != nil {
		return "Dự báo thời tiết 3 ngày tới: Hiện không có dữ liệu.", nil
	}
	res := "Dự báo thời tiết 3 ngày tới: \n"
	for i := 0; i < len(data.Daily.Time) && i < 3; i++ {
		t, _ := time.Parse("2006-01-02", data.Daily.Time[i])
		res += fmt.Sprintf("- Ngày %s: %s; Tỉ lệ mưa: %d%% (%.1fmm); Nhiệt độ: %.0f-%.0f°C\n",
			t.Format("02/01"), s.getWDesc(data.Daily.Weathercode[i]), data.Daily.PrecipitationProbabilityMax[i],
			data.Daily.PrecipitationSum[i], data.Daily.Temperature2mMin[i], data.Daily.Temperature2mMax[i])
	}
	s.forecast, s.lastFetch = res, now
	return res, nil
}

func (s *service) GetGeminiForecast(ctx context.Context) ([]ForecastDay, error) {
	now := time.Now().In(utils.VietnamTZ)
	if len(s.geminiForecast) > 0 && s.lastGeminiFetch.Day() == now.Day() {
		return s.geminiForecast, nil
	}
	data, err := s.forecastSvc.GetHanoiForecast(ctx)
	if err != nil {
		return nil, nil
	}
	var res []ForecastDay
	for i := 0; i < len(data.Daily.Time) && i < 3; i++ {
		t, _ := time.Parse("2006-01-02", data.Daily.Time[i])
		res = append(res, ForecastDay{
			Date:            t.Format("02/01"),
			Description:     s.getWDesc(data.Daily.Weathercode[i]),
			TemperatureMin:  data.Daily.Temperature2mMin[i],
			TemperatureMax:  data.Daily.Temperature2mMax[i],
			RainProbability: data.Daily.PrecipitationProbabilityMax[i],
			RainFall:        data.Daily.PrecipitationSum[i],
		})
	}
	s.geminiForecast, s.lastGeminiFetch = res, now
	return res, nil
}

func (s *service) getWDesc(c int) string {
	switch {
	case c == 0:
		return "Trời quang"
	case c <= 3:
		return "Nhiều mây"
	case c <= 48:
		return "Có sương mù"
	case c <= 67:
		return "Mưa nhỏ"
	case c <= 82:
		return "Mưa rào"
	default:
		return "Có dông sét"
	}
}

func (s *service) GetRainSummary(ctx context.Context, orgID string, assignedIDs []string) (*RainSummaryData, error) {
	rainData, err := s.GetRawRainData(ctx)
	if err != nil {
		return nil, err
	}
	// f := filter.NewBasicFilter()
	// if orgID != "" {
	// 	f.AddWhere("org", "$or", []bson.M{{"org_id": orgID}, {"shared_org_ids": orgID}})
	// }
	// if len(assignedIDs) > 0 {
	// 	f.AddWhere("id", "_id", bson.M{"$in": assignedIDs})
	// }
	stations, _ := s.stationSvc.GetAllRainStations(ctx)
	type stationMeta struct {
		ID       string
		Name     string
		Address  string
		Type     string
		Priority int
	}
	permitted := make(map[int]stationMeta)
	for _, st := range stations {
		if st.OldID > 0 {
			permitted[st.OldID] = stationMeta{
				ID:       st.ID,
				Name:     st.TenTram,
				Address:  st.DiaChi,
				Type:     string(st.Loai),
				Priority: st.TrongSoBaoCao,
			}
		}
	}

	// permitted := make(map[int]string)
	now, rainyCount, measurements := time.Now().In(utils.VietnamTZ), 0, []RainStationStat{}
	for _, d := range rainData.Content.Data {
		tFullBD, _ := utils.ParseTime(d.ThoiGian_BD)
		tFullHT, _ := utils.ParseTime(d.ThoiGian_HT)
		isRaining := false
		diff := now.Sub(tFullHT)
		if !tFullHT.IsZero() && diff >= 0 && diff <= 5*time.Minute {
			isRaining = true
			rainyCount++
		}
		tBD, tHT := d.ThoiGian_BD, d.ThoiGian_HT
		if len(tBD) > 16 {
			tBD = tBD[11:16]
		}
		if len(tHT) > 16 {
			tHT = tHT[11:16]
		}
		sessionRain := d.LuongMua_HT - d.LuongMua_BD
		if sessionRain < 0 {
			sessionRain = 0
		}
		var tramID int
		switch v := d.TramId.(type) {
		case int:
			tramID = v
		case int64:
			tramID = int(v)
		case float64:
			tramID = int(v)
		case string:
			fmt.Sscanf(v, "%d", &tramID)
		default:
			fmt.Sscanf(fmt.Sprintf("%v", d.TramId), "%d", &tramID)
		}
		meta := permitted[tramID]
		if meta.Name == "" || d.LuongMua_HT == 0 {
			continue
		}

		measurements = append(measurements, RainStationStat{
			Name:          meta.Name,
			Address:       meta.Address,
			ID:            meta.ID,
			OldID:         tramID,
			TotalRain:     d.LuongMua_HT,
			SessionRain:   sessionRain,
			StartTime:     tBD,
			EndTime:       tHT,
			StartTimeFull: tFullBD,
			EndTimeFull:   tFullHT,
			IsRaining:     isRaining,
			Type:          meta.Type,
			Priority:      meta.Priority,
		})
	}
	if len(measurements) == 0 {
		return &RainSummaryData{
			TotalStations: len(rainData.Content.Tram),
			SummaryText:   "Hiện tại không mưa",
		}, nil
	}
	sort.Slice(measurements, func(i, j int) bool { return measurements[i].TotalRain > measurements[j].TotalRain })
	intensity, spread := "nhỏ", "diện hẹp"
	if measurements[0].TotalRain > 100 {
		intensity = "rất lớn"
	} else if measurements[0].TotalRain > 50 {
		intensity = "lớn"
	}
	if rainyCount > 20 {
		spread = "diện rộng"
	}
	var minS, maxE time.Time
	for _, m := range measurements {
		if !m.StartTimeFull.IsZero() && (minS.IsZero() || m.StartTimeFull.Before(minS)) {
			minS = m.StartTimeFull
		}
		if !m.EndTimeFull.IsZero() && (maxE.IsZero() || m.EndTimeFull.After(maxE)) {
			maxE = m.EndTimeFull
		}
	}
	sumText := "Hiện tại thành phố không mưa."
	if len(measurements) > 0 {
		stoppedCount := len(measurements) - rainyCount
		if stoppedCount < 0 {
			stoppedCount = 0
		}
		maxStationName := measurements[0].Name
		maxStationRain := measurements[0].TotalRain
		sumText = fmt.Sprintf("Trong ngày ghi nhận tổng cộng %d điểm có mưa, trong đó hiện tại đang mưa %d điểm và đã tạnh %d điểm. Lượng mưa lớn nhất ghi nhận tại %s đạt %.1f mm.",
			len(measurements), rainyCount, stoppedCount, maxStationName, maxStationRain)
	}
	return &RainSummaryData{
		TotalStations:  len(rainData.Content.Tram),
		RainyStations:  rainyCount,
		MaxRainStation: measurements[0],
		Measurements:   measurements,
		IntensityLabel: intensity,
		SpreadLabel:    spread,
		StartTimeFull:  minS,
		EndTimeFull:    maxE,
		SummaryText:    sumText,
	}, nil
}
