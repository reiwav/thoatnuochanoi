package googleapi

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"context"
	"fmt"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type RainStationStat struct {
	Name        string  `json:"name"`
	TotalRain   float64 `json:"total_rain"`
	SessionRain float64 `json:"session_rain"`
	StartTime   string  `json:"start_time"`
	EndTime     string  `json:"end_time"`
	IsRaining   bool    `json:"is_raining"`
}

type RainSummaryData struct {
	TotalStations  int               `json:"total_stations"`
	RainyStations  int               `json:"rainy_stations"`
	MaxRainStation RainStationStat   `json:"max_rain_station"`
	Measurements   []RainStationStat `json:"measurements"`
	SummaryText    string            `json:"summary_text,omitempty"`
}

func (s *service) getPermittedRainStations(ctx context.Context, orgID string) (map[int]bool, error) {
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

func (s *service) GetRainSummary(ctx context.Context, orgID string) (*RainSummaryData, error) {
	rainData, err := s.weatherSvc.GetRawRainData(ctx)
	if err != nil {
		fmt.Printf(" [GoogleAPI] Rain API Error: %v\n", err)
		return nil, err
	}
	permitted, err := s.getPermittedRainStations(ctx, orgID)
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

		if orgID != "" && orgID != "all" && !permitted[id] {
			continue // Skip stations not permitted
		}

		stationMap[id] = t.TenPhuong
	}

	now := time.Now().In(time.FixedZone("Asia/Ho_Chi_Minh", 7*60*60))
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

			if orgID != "" && orgID != "all" && !permitted[id] {
				continue
			}

			// Parse ThoiGian_HT to check if it's currently raining (last update within 5 minutes)
			isRaining := false
			var lastUpdate time.Time
			layout := "2006-01-02T15:04:05" // From weather.convertUTCToVietnam
			if t, err := time.ParseInLocation(layout, d.ThoiGian_HT, now.Location()); err == nil {
				lastUpdate = t
			} else {
				layoutSecondary := "2006-01-02 15:04:05"
				if t, err := time.ParseInLocation(layoutSecondary, d.ThoiGian_HT, now.Location()); err == nil {
					lastUpdate = t
				}
			}

			if !lastUpdate.IsZero() && now.Sub(lastUpdate) <= 5*time.Minute {
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
			measurements = append(measurements, RainStationStat{
				Name:        stationMap[id],
				TotalRain:   d.LuongMua_HT,
				SessionRain: sessionRain,
				StartTime:   tBD,
				EndTime:     tHT,
				IsRaining:   isRaining,
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
