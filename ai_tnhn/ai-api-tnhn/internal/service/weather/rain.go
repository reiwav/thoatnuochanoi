package weather

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/utils"
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) GetRawRainData(ctx context.Context) (*RainDataResponse, error) {
	return s.thoatnuocSvc.GetRawRainData(ctx)
}

func (s *service) GetHistoricalRainData(ctx context.Context) (HistoricalRainData, error) {
	records, err := s.histRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch historical rain data from DB: %w", err)
	}

	results := make(HistoricalRainData)
	for _, r := range records {
		if _, ok := results[r.Station]; !ok {
			results[r.Station] = make(map[string]float64)
		}
		results[r.Station][r.Date] = r.Rainfall
	}

	return results, nil
}

func (s *service) GetComparisonData(ctx context.Context, year1, year2 int) (interface{}, error) {
	totals, err := s.histRepo.GetMonthlyTotals(ctx, []int{year1, year2})
	if err != nil {
		return nil, err
	}

	// Structure: map[year]map[month]map[station]total
	data := make(map[int]map[int]map[string]float64)
	data[year1] = make(map[int]map[string]float64)
	data[year2] = make(map[int]map[string]float64)

	stations := make(map[string]bool)

	for _, t := range totals {
		stations[t.Station] = true
		if _, ok := data[t.Year][t.Month]; !ok {
			data[t.Year][t.Month] = make(map[string]float64)
		}
		data[t.Year][t.Month][t.Station] = t.Total
	}

	// Also calculate annual totals
	annualTotals := make(map[int]map[string]float64)
	annualTotals[year1] = make(map[string]float64)
	annualTotals[year2] = make(map[string]float64)

	for y, months := range data {
		for _, stMap := range months {
			for st, val := range stMap {
				annualTotals[y][st] += val
			}
		}
	}

	stationList := []string{}
	for s := range stations {
		stationList = append(stationList, s)
	}

	return gin.H{
		"year1":        year1,
		"year2":        year2,
		"data":         data,
		"annualTotals": annualTotals,
		"stations":     stationList,
	}, nil
}

func (s *service) getPermittedRainStations(ctx context.Context, orgID string, assignedIDs []string) (map[int]bool, error) {
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

	stations, _, err := s.stationSvc.ListRainStations(ctx, f)
	if err != nil {
		return nil, err
	}

	permitted := make(map[int]bool)
	for _, st := range stations {
		if st.OldID > 0 {
			permitted[st.OldID] = true
		}
	}
	return permitted, nil
}

func (s *service) GetRainSummary(ctx context.Context, orgID string, assignedIDs []string) (*RainSummaryData, error) {
	rainData, err := s.GetRawRainData(ctx)
	if err != nil {
		return nil, err
	}
	permitted, err := s.getPermittedRainStations(ctx, orgID, assignedIDs)
	if err != nil {
		return nil, err
	}

	stationMap := make(map[int]string)
	for _, t := range rainData.Content.Tram {
		var id int
		if v, ok := t.Id.(float64); ok {
			id = int(v)
		} else if v, ok := t.Id.(string); ok {
			fmt.Sscanf(v, "%d", &id)
		}

		if orgID != "" && !permitted[id] {
			continue // Skip stations not permitted
		}

		stationMap[id] = t.TenPhuong
	}

	now := time.Now().In(utils.VietnamTZ)
	var measurements []RainStationStat
	rainyCount := 0

	for _, d := range rainData.Content.Data {
		if d.LuongMua_HT > 0 {
			var id int
			if v, ok := d.TramId.(float64); ok {
				id = int(v)
			} else if v, ok := d.TramId.(string); ok {
				fmt.Sscanf(v, "%d", &id)
			}

			if orgID != "" && !permitted[id] {
				continue
			}

			// Parse ThoiGian_HT to check if it's currently raining (last update within 5 minutes)
			isRaining := false
			lastUpdate, err := utils.ParseTime(d.ThoiGian_HT)
			if err != nil {
				continue
			}

			diff := now.Sub(lastUpdate)
			if !lastUpdate.IsZero() && diff >= 0 && diff <= 5*time.Minute {
				isRaining = true
				rainyCount++
			}

			tBD := d.ThoiGian_BD
			if len(tBD) > 16 {
				tBD = tBD[11:16]
			}

			tHT := d.ThoiGian_HT
			if len(tHT) > 16 {
				tHT = tHT[11:16]
			}
			sessionRain := d.LuongMua_HT - d.LuongMua_BD
			if sessionRain < 0 {
				sessionRain = 0
			}
			tFullBD, err := utils.ParseTime(d.ThoiGian_BD)
			if err != nil {
				continue
			}
			tFullHT, err := utils.ParseTime(d.ThoiGian_HT)
			if err != nil {
				continue
			}

			measurements = append(measurements, RainStationStat{
				Name:          stationMap[id],
				TotalRain:     d.LuongMua_HT,
				SessionRain:   sessionRain,
				StartTime:     tBD,
				EndTime:       tHT,
				StartTimeFull: tFullBD,
				EndTimeFull:   tFullHT,
				IsRaining:     isRaining,
			})
		}
	}

	if len(measurements) == 0 {
		return &RainSummaryData{
			TotalStations: len(rainData.Content.Tram),
			RainyStations: 0,
			Measurements:  []RainStationStat{},
		}, nil
	}

	sort.Slice(measurements, func(i, j int) bool {
		return measurements[i].TotalRain > measurements[j].TotalRain
	})

	return &RainSummaryData{
		TotalStations:  len(rainData.Content.Tram),
		RainyStations:  rainyCount,
		MaxRainStation: measurements[0],
		Measurements:   measurements,
	}, nil
}
