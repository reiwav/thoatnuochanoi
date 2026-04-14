package googleapi

import (
	"context"
	"time"

	"ai-api-tnhn/internal/base/mgo/filter"

	"go.mongodb.org/mongo-driver/bson"
)

type PumpingStationStat struct {
	Name             string `json:"name"`
	OrgName          string `json:"org_name"`
	PumpCount        int    `json:"pump_count"`
	OperatingCount   int    `json:"operating_count"`
	ClosedCount      int    `json:"closed_count"`
	MaintenanceCount int    `json:"maintenance_count"`
	Note             string `json:"note"`
	LastUpdate       string `json:"last_update"`
}

type PumpingStationSummaryData struct {
	TotalStations       int                  `json:"total_stations"`
	TotalPumps          int                  `json:"total_pumps"`
	TotalOperatingPumps int                  `json:"total_operating_pumps"`
	Stations            []PumpingStationStat `json:"stations"`
}

func (s *service) GetPumpingStationSummary(ctx context.Context, orgID string, assignedIDs []string) (*PumpingStationSummaryData, error) {
	if orgID == "all" {
		orgID = ""
	}

	f := filter.NewBasicFilter()

	if orgID != "" {
		f.AddWhere("org_wrapper", "$or", []bson.M{
			{"org_id": orgID},
			{"shared_org_ids": orgID},
		})
	}

	if len(assignedIDs) > 0 {
		f.AddWhere("id_in", "_id", bson.M{"$in": assignedIDs})
	}

	stations, _, err := s.pumpingSvc.List(ctx, f)
	if err != nil {
		return nil, err
	}

	// For simplicity, we assume orgs mapped inside pumpingSvc.List returns OrgName in some way.
	// But models.PumpingStation does not have OrgName natively yet. The caller usually maps it.
	// So we'll map it manually.
	orgs, _ := s.inuSvc.ListOrganizations(ctx) // Re-use organization list from inuSvc
	orgMap := make(map[string]string)
	for _, org := range orgs {
		orgMap[org.ID] = org.Name
	}

	var totalPumps, totalOperating int
	var stationStats []PumpingStationStat

	for _, st := range stations {
		lastUpdate := "-"
		ops := 0
		closed := st.PumpCount
		maint := 0
		note := "-"

		if st.LastReport != nil {
			ops = st.LastReport.OperatingCount
			closed = st.LastReport.ClosedCount
			maint = st.LastReport.MaintenanceCount
			if st.LastReport.Note != "" {
				note = st.LastReport.Note
			}
			lastUpdate = time.Unix(st.LastReport.Timestamp, 0).Format("15:04")
		}

		totalPumps += st.PumpCount
		totalOperating += ops

		stationStats = append(stationStats, PumpingStationStat{
			Name:             st.Name,
			OrgName:          orgMap[st.OrgID],
			PumpCount:        st.PumpCount,
			OperatingCount:   ops,
			ClosedCount:      closed,
			MaintenanceCount: maint,
			Note:             note,
			LastUpdate:       lastUpdate,
		})
	}

	return &PumpingStationSummaryData{
		TotalStations:       len(stations),
		TotalPumps:          totalPumps,
		TotalOperatingPumps: totalOperating,
		Stations:            stationStats,
	}, nil
}
