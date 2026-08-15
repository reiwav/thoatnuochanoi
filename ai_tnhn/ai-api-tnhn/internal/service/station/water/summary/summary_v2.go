package summary

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/service/station/water/dto"
	"context"
	"time"
)

func (s *service) GetWaterSummaryV2(ctx context.Context) ([]dto.WaterStationV2, error) {
	f := filter.NewBasicFilter()
	f.AddWhere("active", "active", true)

	// Fetch active stations from DB
	lakeStations, _, err := s.stationSvc.ListLakeStations(ctx, f)
	if err != nil {
		return nil, err
	}
	riverStations, _, err := s.stationSvc.ListRiverStations(ctx, f)
	if err != nil {
		return nil, err
	}

	var stations []dto.WaterStationV2

	// Lake Stations
	for _, lake := range lakeStations {
		dataMode := lake.DataMode
		if dataMode == "" {
			if lake.IsAuto {
				dataMode = "auto"
			} else {
				dataMode = "manual"
			}
		}
		st := dto.WaterStationV2{
			ID:       lake.ID,
			OldID:    lake.OldID,
			TenTram:  lake.TenTram,
			DiaChi:   lake.DiaChi,
			ThuTu:    lake.ThuTu,
			Loai:     "lake",
			DataMode: dataMode,
			IsAuto:   lake.IsAuto || dataMode == "auto",
		}

		todayStr := time.Now().Format("2006-01-02")
		if lake.LatestRecord != nil && lake.LatestRecord.Timestamp.Format("2006-01-02") == todayStr {
			st.LatestRecord = &dto.LatestWaterRecord{
				RecordID:        lake.LatestRecord.RecordID,
				StationID:       lake.LatestRecord.StationID,
				StationName:     lake.LatestRecord.StationName,
				Value:           lake.LatestRecord.Value,
				Timestamp:       lake.LatestRecord.Timestamp,
				Date:            lake.LatestRecord.Date,
				Source:          lake.LatestRecord.Source,
				ThresholdStatus: string(lake.LatestRecord.ThresholdStatus),
				MinThreshold:    lake.LatestRecord.MinThreshold,
				MaxThreshold:    lake.LatestRecord.MaxThreshold,
			}
		} else {
			st.LatestRecord = nil
		}
		stations = append(stations, st)
	}

	// River Stations
	for _, river := range riverStations {
		dataMode := river.DataMode
		if dataMode == "" {
			if river.IsAuto {
				dataMode = "auto"
			} else {
				dataMode = "manual"
			}
		}
		st := dto.WaterStationV2{
			ID:       river.ID,
			OldID:    river.OldID,
			TenTram:  river.TenTram,
			DiaChi:   river.DiaChi,
			ThuTu:    river.ThuTu,
			Loai:     "river",
			DataMode: dataMode,
			IsAuto:   river.IsAuto || dataMode == "auto",
		}

		todayStr := time.Now().Format("2006-01-02")
		if river.LatestRecord != nil && river.LatestRecord.Timestamp.Format("2006-01-02") == todayStr {
			st.LatestRecord = &dto.LatestWaterRecord{
				RecordID:        river.LatestRecord.RecordID,
				StationID:       river.LatestRecord.StationID,
				StationName:     river.LatestRecord.StationName,
				Value:           river.LatestRecord.Value,
				Timestamp:       river.LatestRecord.Timestamp,
				Date:            river.LatestRecord.Date,
				Source:          river.LatestRecord.Source,
				ThresholdStatus: string(river.LatestRecord.ThresholdStatus),
				MinThreshold:    river.LatestRecord.MinThreshold,
				MaxThreshold:    river.LatestRecord.MaxThreshold,
			}
		} else {
			st.LatestRecord = nil
		}
		stations = append(stations, st)
	}

	return stations, nil
}
