package publicapi

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/dto"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

// GetStationsMasterList retrieves all stations (or filtered by type)
func (s *service) GetStationsMasterList(ctx context.Context, stationType string) ([]dto.PublicStationMaster, error) {
	var results []dto.PublicStationMaster

	f := filter.NewPaginationFilter()
	f.Page = 1
	f.PerPage = 10000 // get all
	f.AddWhere("active", "active", true)

	if stationType == "" || stationType == "lake" {
		lakes, _, err := s.lakeStationRepo.List(ctx, f)
		if err == nil {
			for _, st := range lakes {
				results = append(results, dto.PublicStationMaster{
					ID:      st.ID,
					Name:    st.TenTram,
					Address: st.DiaChi,
					Type:    "lake",
				})
			}
		}
	}

	if stationType == "" || stationType == "river" {
		rivers, _, err := s.riverStationRepo.List(ctx, f)
		if err == nil {
			for _, st := range rivers {
				results = append(results, dto.PublicStationMaster{
					ID:      st.ID,
					Name:    st.TenTram,
					Address: st.DiaChi,
					Type:    "river",
				})
			}
		}
	}

	if stationType == "" || stationType == "rain" {
		rains, _, err := s.rainStationRepo.List(ctx, f)
		if err == nil {
			for _, st := range rains {
				results = append(results, dto.PublicStationMaster{
					ID:      st.ID,
					Name:    st.TenTram,
					Address: st.DiaChi,
					Type:    "rain",
				})
			}
		}
	}

	if stationType == "" || stationType == "inundation" {
		inus, _, err := s.inuStationRepo.List(ctx, f)
		if err == nil {
			for _, st := range inus {
				results = append(results, dto.PublicStationMaster{
					ID:      st.ID,
					Name:    st.Name,
					Address: st.Address,
					Lat:     st.Lat,
					Lng:     st.Lng,
					Type:    "inundation",
				})
			}
		}
	}

	// Add sluice_gate and wastewater here if needed

	return results, nil
}

func parseTimeRange(dateStr string, isRain bool) (time.Time, time.Time) {
	// Default to today if empty
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	t, err := time.ParseInLocation("2006-01-02", dateStr, loc)
	if err != nil {
		t = time.Now().In(loc) // Fallback to today on error
	}

	if isRain {
		// Rain logic: 07:00 yesterday to 07:00 today
		startTime := t.Add(-24 * time.Hour).Add(7 * time.Hour)
		endTime := t.Add(7 * time.Hour)
		return startTime, endTime
	} else {
		// Other logic: 00:00 to 23:59:59 today
		startTime := t
		endTime := t.Add(24 * time.Hour).Add(-time.Second)
		return startTime, endTime
	}
}

func (s *service) GetPublicWaterData(ctx context.Context, stationType, stationID, dateStr string) ([]dto.PublicWaterData, error) {
	var results []dto.PublicWaterData
	var oldID int64 = -1

	if stationType == "lake" {
		st, err := s.lakeStationRepo.GetByID(ctx, stationID)
		if err == nil && st != nil {
			oldID = int64(st.OldID)
		}
	} else if stationType == "river" {
		st, err := s.riverStationRepo.GetByID(ctx, stationID)
		if err == nil && st != nil {
			oldID = int64(st.OldID)
		}
	}

	if oldID == -1 {
		return results, nil // Station not found
	}

	start, end := parseTimeRange(dateStr, false)

	if stationType == "lake" {
		records, err := s.lakeRepo.GetByDateRange(ctx, start, end)
		if err == nil {
			for _, r := range records {
				if r.StationID == oldID {
					results = append(results, dto.PublicWaterData{
						CurrentLevel: float64(r.Value),
						Timestamp:    r.Timestamp,
						Status:       "normal", // can be mapped if needed
					})
				}
			}
		}
	} else if stationType == "river" {
		records, err := s.riverRepo.GetByDateRange(ctx, start, end)
		if err == nil {
			for _, r := range records {
				if r.StationID == oldID {
					results = append(results, dto.PublicWaterData{
						CurrentLevel: float64(r.Value),
						Timestamp:    r.Timestamp,
						Status:       "normal",
					})
				}
			}
		}
	}

	return results, nil
}

func (s *service) GetPublicRainData(ctx context.Context, stationID, dateStr string) ([]dto.PublicRainData, error) {
	var results []dto.PublicRainData
	st, err := s.rainStationRepo.GetByID(ctx, stationID)
	if err != nil || st == nil {
		return results, nil
	}
	oldID := int64(st.OldID)

	start, end := parseTimeRange(dateStr, true)
	records, err := s.rainRepo.GetAllByStationID(ctx, oldID, start, end)
	if err == nil {
		for _, r := range records {
			results = append(results, dto.PublicRainData{
				Rain1H:    float64(r.Value),
				Timestamp: r.Timestamp,
			})
		}
	}

	return results, nil
}

func (s *service) GetPublicInundationData(ctx context.Context, stationID, dateStr string) ([]dto.PublicInundationData, error) {
	var results []dto.PublicInundationData
	start, end := parseTimeRange(dateStr, false)

	f := filter.NewPaginationFilter()
	f.Page = 1
	f.PerPage = 1000
	f.AddWhere("inundation_id", "inundation_id", stationID)
	f.AddWhere("time", "created_at", bson.M{"$gte": start, "$lte": end})
	f.SetOrderBy("-created_at")

	records, _, err := s.inuHistoryRepo.List(ctx, f)
	if err == nil {
		for _, r := range records {
			status := "normal"
			if r.Depth > 0 {
				status = "flooded"
			}
			results = append(results, dto.PublicInundationData{
				Status:       status,
				CurrentDepth: r.Depth,
				History:      nil,
			})
		}
	}

	return results, nil
}

func (s *service) GetPublicSluiceGateData(ctx context.Context, stationID, dateStr string) ([]dto.PublicSluiceGateData, error) {
	var results []dto.PublicSluiceGateData
	start, end := parseTimeRange(dateStr, false)

	f := filter.NewPaginationFilter()
	f.Page = 1
	f.PerPage = 1000
	f.AddWhere("station_id", "sluice_gate_id", stationID)
	f.AddWhere("time", "timestamp", bson.M{"$gte": start.Unix(), "$lte": end.Unix()})
	f.SetOrderBy("-timestamp")

	records, _, err := s.sluiceGateRepo.ListHistory(ctx, f)
	if err == nil {
		for _, r := range records {
			results = append(results, dto.PublicSluiceGateData{
				IsOpen:    r.Action == "open",
				OpenLevel: 0,
				Timestamp: time.Unix(r.Timestamp, 0),
			})
		}
	}
	return results, nil
}

func (s *service) GetPublicWastewaterData(ctx context.Context, stationID, dateStr string) ([]dto.PublicWastewaterData, error) {
	var results []dto.PublicWastewaterData
	start, end := parseTimeRange(dateStr, false)

	f := filter.NewPaginationFilter()
	f.Page = 1
	f.PerPage = 1000
	f.AddWhere("station_id", "station_id", stationID)
	f.AddWhere("time", "timestamp", bson.M{"$gte": start.Unix(), "$lte": end.Unix()})
	f.SetOrderBy("-timestamp")

	records, _, err := s.wastewaterRepo.ListReports(ctx, f)
	if err == nil {
		for _, r := range records {
			results = append(results, dto.PublicWastewaterData{
				FlowRate:  0,
				Timestamp: time.Unix(r.Timestamp, 0),
			})
		}
	}
	return results, nil
}
