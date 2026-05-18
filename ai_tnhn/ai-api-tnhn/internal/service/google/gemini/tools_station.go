package gemini

import (
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/service/google/googleapi"
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/generative-ai-go/genai"
)

// isCurrentRainDay checks if the given date string matches the current active rain day cycle.
// Rain day D: 7h D → 7h (D+1). Before 7AM, current rain day is yesterday.
// At or after 7AM, current rain day is today.
func (s *service) isCurrentRainDay(date string) bool {
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	now := time.Now().In(loc)
	cutoff := time.Date(now.Year(), now.Month(), now.Day(), 7, 0, 0, 0, loc)
	var currentRainDay string
	if now.Before(cutoff) {
		currentRainDay = now.AddDate(0, 0, -1).Format("2006-01-02")
	} else {
		currentRainDay = now.Format("2006-01-02")
	}
	return date == currentRainDay || date == now.Format("2006-01-02")
}

func (s *service) handleDR(ctx context.Context, c *genai.FunctionCall, orgID string, ids []string) (interface{}, error) {
	dStr := c.Args["date"].(string)
	var targetTime time.Time
	var hasTime bool
	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	if tStr, ok := c.Args["time"].(string); ok && tStr != "" {
		if tt, err := time.ParseInLocation("2006-01-02 15:04:05", dStr+" "+tStr, loc); err == nil {
			targetTime = tt
			hasTime = true
			if targetTime.Hour() < 7 {
				dStr = targetTime.AddDate(0, 0, -1).Format("2006-01-02")
			}
		} else if tt, err := time.ParseInLocation("2006-01-02 15:04", dStr+" "+tStr, loc); err == nil {
			targetTime = tt
			hasTime = true
			if targetTime.Hour() < 7 {
				dStr = targetTime.AddDate(0, 0, -1).Format("2006-01-02")
			}
		}
	}

	d, e := s.rainSvc.GetRainDataByDate(ctx, dStr)
	if e != nil {
		return nil, e
	}
	
	// Filter by time
	var timeFiltered []*models.RainRecord
	for _, r := range d {
		if !hasTime || !r.Timestamp.In(loc).After(targetTime) {
			timeFiltered = append(timeFiltered, r)
		}
	}
	d = timeFiltered

	if orgID == "" {
		return d, nil
	}
	
	al, _ := s.stationSvc.ListRainStationsFiltered(ctx, orgID, ids)
	am := make(map[int]bool)
	for _, st := range al {
		am[st.OldID] = true
	}
	var res []*models.RainRecord
	for _, r := range d {
		if am[int(r.StationID)] {
			res = append(res, r)
		}
	}
	return res, nil
}

func (s *service) handleLS(ctx context.Context, c *genai.FunctionCall, o string, r, l, rv []string) (interface{}, error) {
	t := c.Args["type"].(string)
	log.Printf("[handleLS] type=%s, args=%v", t, c.Args)
	switch t {
	case "rain":
		if c.Args["date"] != nil {
			if dStr, ok := c.Args["date"].(string); ok && dStr != "" {
				var targetTime time.Time
				var hasTime bool
				loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
				if tStr, ok := c.Args["time"].(string); ok && tStr != "" {
					if tt, err := time.ParseInLocation("2006-01-02 15:04:05", dStr+" "+tStr, loc); err == nil {
						targetTime = tt
						hasTime = true
						// If time is before 7:00 AM, the rain cycle belongs to the previous day
						if targetTime.Hour() < 7 {
							dStr = targetTime.AddDate(0, 0, -1).Format("2006-01-02")
						}
					} else if tt, err := time.ParseInLocation("2006-01-02 15:04", dStr+" "+tStr, loc); err == nil {
						targetTime = tt
						hasTime = true
						if targetTime.Hour() < 7 {
							dStr = targetTime.AddDate(0, 0, -1).Format("2006-01-02")
						}
					}
				}
				
				displayDate := dStr
				if hasTime {
					displayDate = targetTime.Format("2006-01-02 15:04:05")
				}

				// If requesting current live data and NO specific time (or time is near now)
				if !hasTime && s.isCurrentRainDay(dStr) {
					if summary, err := s.weatherSvc.GetRainSummary(ctx, o, r); err == nil && summary != nil {
						var res []googleapi.RainTableRow
						for i, m := range summary.Measurements {
							if m.TotalRain > 0 {
								res = append(res, googleapi.NewRainTableRow(i+1, m.ID, m.OldID, m.Name, m.Address, m.Type, m.Priority, m.TotalRain, m.IsRaining, m.StartTime, m.EndTime, dStr))
							}
						}
						log.Printf("[handleLS] live rain: returning %d stations", len(res))
						return res, nil
					}
				}

				// Historical date fallback (or specific time requested)
				sts, e := s.stationSvc.ListRainStationsFiltered(ctx, o, r)
				records, err := s.rainSvc.GetRainDataByDate(ctx, dStr)
				
				// Filter records by time if requested
				var filteredRecords []*models.RainRecord
				if err == nil {
					for _, rec := range records {
						if !hasTime || !rec.Timestamp.In(loc).After(targetTime) {
							filteredRecords = append(filteredRecords, rec)
						}
					}
				}
				records = filteredRecords

				log.Printf("[handleLS] historical: stations=%d, filtered_records=%d, err=%v", len(sts), len(records), err)
				if err == nil && len(records) > 0 {
					// Calculate total rain per station (LuongMua is cumulative, take max)
					type stationRain struct {
						totalRain float64
						maxValue  float64
					}
					stationRainMap := make(map[int]*stationRain)
					for _, rec := range records {
						sid := int(rec.StationID)
						sr, ok := stationRainMap[sid]
						if !ok {
							sr = &stationRain{}
							stationRainMap[sid] = sr
						}
						if rec.Value > sr.maxValue {
							sr.totalRain = rec.Value
							sr.maxValue = rec.Value
						}
					}

					var res []googleapi.RainTableRow
					for _, st := range sts {
						sr, ok := stationRainMap[st.OldID]
						if !ok || sr.totalRain <= 0 {
							continue
						}
						res = append(res, googleapi.RainTableRow{
							ID:        st.ID,
							OldID:     st.OldID,
							Tram:      st.TenTram,
							DiaChi:    st.DiaChi,
							LuongMua:  fmt.Sprintf("%.1f", sr.totalRain),
							Type:      string(st.Loai),
							TotalRain: sr.totalRain,
							IsRaining: false,
							Date:      displayDate,
						})
					}
					return res, nil
				}
				// No rain records found — return station list without rain data
				var res []googleapi.RainTableRow
				for _, st := range sts {
					res = append(res, googleapi.RainTableRow{
						ID:   st.ID,
						OldID: st.OldID,
						Tram: st.TenTram,
						DiaChi: st.DiaChi,
						Date: displayDate,
					})
				}
				return res, e
			}
		}

		sts, e := s.stationSvc.ListRainStationsFiltered(ctx, o, r)
		var res []googleapi.RainTableRow
		for _, st := range sts {
			date, _ := c.Args["date"].(string)
			res = append(res, googleapi.RainTableRow{
				ID:    st.ID,
				OldID: st.OldID,
				Tram:  st.TenTram,
				DiaChi: st.DiaChi,
				Date:  date,
			})
		}
		return res, e
	case "lake":
		sts, e := s.stationSvc.ListLakeStationsFiltered(ctx, o, l)
		var res []map[string]interface{}
		for _, st := range sts {
			res = append(res, map[string]interface{}{"id": st.ID, "old_id": st.OldID, "name": st.TenTram, "phuong": st.TenPhuong, "loai": st.Loai})
		}
		return res, e
	case "river":
		sts, e := s.stationSvc.ListRiverStationsFiltered(ctx, o, rv)
		var res []map[string]interface{}
		for _, st := range sts {
			res = append(res, map[string]interface{}{"id": st.ID, "old_id": st.OldID, "name": st.TenTram, "phuong": st.TenPhuong, "loai": st.Loai})
		}
		return res, e
	}
	return nil, fmt.Errorf("invalid type")
}

func (s *service) handleRA(ctx context.Context, c *genai.FunctionCall, o string, ids []string) (interface{}, error) {
	sID, _ := c.Args["station_id"].(float64)
	if o != "" {
		al, _ := s.stationSvc.ListRainStationsFiltered(ctx, o, ids)
		f := false
		for _, st := range al {
			if int64(st.OldID) == int64(sID) {
				f = true
				break
			}
		}
		if !f {
			return nil, fmt.Errorf("no permission")
		}
	}
	y, _ := c.Args["year"].(float64)
	m, _ := c.Args["month"].(float64)
	sd, _ := c.Args["start_date"].(string)
	ed, _ := c.Args["end_date"].(string)
	gb, _ := c.Args["group_by"].(string)
	return s.stationDataSvc.GetRainAnalytics(ctx, int64(sID), int(y), int(m), sd, ed, gb)
}

func (s *service) handleCW(ctx context.Context, o string, ids []string) (interface{}, error) {
	r, _ := s.stationSvc.ListRainStationsFiltered(ctx, o, ids)
	w := make(map[string]bool)
	for _, st := range r {
		if st.TenPhuong != "" {
			w[st.TenPhuong] = true
		}
	}
	var res []string
	for k := range w {
		res = append(res, k)
	}
	return res, nil
}
