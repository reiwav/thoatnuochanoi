package publicapi

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/dto"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils"
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

// GetStationsMasterList retrieves all stations (or filtered by type)
func (s *service) GetStationsMasterList(ctx context.Context, stationType string) ([]dto.PublicStationMaster, error) {
	var results []dto.PublicStationMaster

	filterActive := bson.M{"active": true}

	if stationType == "" || stationType == "lake" {
		var lakes []*models.LakeStation
		err := s.lakeStationRepo.R_SelectMany(ctx, filterActive, &lakes)
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
		var rivers []*models.RiverStation
		err := s.riverStationRepo.R_SelectMany(ctx, filterActive, &rivers)
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
		var rains []*models.RainStation
		err := s.rainStationRepo.R_SelectMany(ctx, filterActive, &rains)
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
		var inus []*models.InundationStation
		err := s.inuStationRepo.R_SelectMany(ctx, filterActive, &inus)
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

	if stationType == "" || stationType == "sluice_gate" {
		f := filter.NewBasicFilter().AddWhere("active", "active", true)
		gates, _, err := s.sluiceGateRepo.List(ctx, f)
		if err == nil {
			for _, st := range gates {
				results = append(results, dto.PublicStationMaster{
					ID:      st.ID,
					Name:    st.Name,
					Address: st.Address,
					Type:    "sluice_gate",
				})
			}
		}
	}

	if stationType == "" || stationType == "wastewater" {
		f := filter.NewBasicFilter().AddWhere("active", "active", true)
		wws, _, err := s.wastewaterRepo.List(ctx, f)
		if err == nil {
			for _, st := range wws {
				results = append(results, dto.PublicStationMaster{
					ID:      st.ID,
					Name:    st.Name,
					Address: st.Address,
					Type:    "wastewater",
				})
			}
		}
	}

	return results, nil
}

func parseTimeRange(dateUnix int64, isRain bool) (time.Time, time.Time) {
	t := time.Unix(dateUnix, 0).In(utils.VietnamLocation)

	t = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, utils.VietnamLocation)

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


