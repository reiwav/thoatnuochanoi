package water

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"context"
	"time"
)

// LatestWaterRecord giữ nguyên cấu trúc của LakeRecord / RiverRecord trong DB
type LatestWaterRecord struct {
	RecordID        string    `json:"record_id"`
	StationID       int64     `json:"station_id"`
	StationName     string    `json:"station_name"`
	Value           float64   `json:"value"`
	Timestamp       time.Time `json:"timestamp"`
	Date            string    `json:"date"`
	Source          string    `json:"source"`
	ThresholdStatus string    `json:"threshold_status"`
	MinThreshold    float64   `json:"min_threshold"`
	MaxThreshold    float64   `json:"max_threshold"`
}

// WaterStationV2 trả về thông tin trạm kèm bản ghi mực nước mới nhất từ DB
type WaterStationV2 struct {
	ID           string             `json:"id"`
	OldID        int                `json:"old_id"`
	TenTram      string             `json:"ten_tram"`
	DiaChi       string             `json:"dia_chi,omitempty"`
	ThuTu        int                `json:"thu_tu"`
	Loai         string             `json:"loai"` // "lake" hoặc "river"
	DataMode     string             `json:"data_mode"`
	IsAuto       bool               `json:"is_auto"`
	LatestRecord *LatestWaterRecord `json:"latest_record"`
}

func (s *service) GetWaterSummaryV2(ctx context.Context) ([]WaterStationV2, error) {
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

	var stations []WaterStationV2

	// Lake Stations
	for _, lake := range lakeStations {
		if lake.OldID <= 0 {
			continue
		}
		dataMode := lake.DataMode
		if dataMode == "" {
			if lake.IsAuto {
				dataMode = "auto"
			} else {
				dataMode = "manual"
			}
		}
		st := WaterStationV2{
			ID:       lake.ID,
			OldID:    lake.OldID,
			TenTram:  lake.TenTram,
			DiaChi:   lake.DiaChi,
			ThuTu:    lake.ThuTu,
			Loai:     "lake",
			DataMode: dataMode,
			IsAuto:   lake.IsAuto || dataMode == "auto",
		}

		if lake.LatestRecord != nil && time.Since(lake.LatestRecord.Timestamp) < 24*time.Hour {
			st.LatestRecord = &LatestWaterRecord{
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
		if river.OldID <= 0 {
			continue
		}
		dataMode := river.DataMode
		if dataMode == "" {
			if river.IsAuto {
				dataMode = "auto"
			} else {
				dataMode = "manual"
			}
		}
		st := WaterStationV2{
			ID:       river.ID,
			OldID:    river.OldID,
			TenTram:  river.TenTram,
			DiaChi:   river.DiaChi,
			ThuTu:    river.ThuTu,
			Loai:     "river",
			DataMode: dataMode,
			IsAuto:   river.IsAuto || dataMode == "auto",
		}

		if river.LatestRecord != nil && time.Since(river.LatestRecord.Timestamp) < 24*time.Hour {
			st.LatestRecord = &LatestWaterRecord{
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
		}
		stations = append(stations, st)
	}

	return stations, nil
}
