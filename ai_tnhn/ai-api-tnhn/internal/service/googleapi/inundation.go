package googleapi

import (
	"context"
	"sort"
	"time"
)

type InundationUpdateStat struct {
	Timestamp   string `json:"timestamp"`
	Description string `json:"description"`
	Depth       string `json:"depth"`
}

type InundationStationStat struct {
	StreetName    string                 `json:"street_name"`
	OrgName       string                 `json:"org_name"`
	Depth         string                 `json:"depth"`
	Width         string                 `json:"width"`
	Length        string                 `json:"length"`
	StartTime     string                 `json:"start_time"`
	Description   string                 `json:"description"`
	CurrentStatus string                 `json:"current_status"`
	Updates       []InundationUpdateStat `json:"updates"`
}

type InundationSummaryData struct {
	ActivePoints  int                     `json:"active_points"`
	OngoingPoints []InundationStationStat `json:"ongoing_points"`
}

func (s *service) GetInundationSummary(ctx context.Context, orgID string, assignedInuIDs []string) (*InundationSummaryData, error) {
	if orgID == "all" {
		orgID = ""
	}
	reports, _, err := s.inuSvc.ListReportsWithFilter(ctx, orgID, "", "active", "", "", assignedInuIDs, 0, 1000)
	if err != nil {
		return nil, err
	}

	// Fetch all organizations once to map OrgID to OrgName efficiently
	orgs, _ := s.inuSvc.ListOrganizations(ctx)
	orgMap := make(map[string]string)
	for _, org := range orgs {
		orgMap[org.ID] = org.Name
	}

	var ongoing []InundationStationStat
	for _, r := range reports {
		var updates []InundationUpdateStat
		for _, u := range r.Updates {
			updates = append(updates, InundationUpdateStat{
				Timestamp:   time.Unix(u.Timestamp, 0).Format("15:04 02/01/2006"),
				Description: u.Description,
				Depth:       u.Depth,
			})
		}

		ongoing = append(ongoing, InundationStationStat{
			StreetName:    r.StreetName,
			OrgName:       orgMap[r.OrgID],
			Depth:         r.Depth,
			Width:         r.Width,
			Length:        r.Length,
			StartTime:     time.Unix(r.StartTime, 0).Format("15:04 02/01/2006"),
			Description:   r.Description,
			CurrentStatus: "Đang ngập lụt",
			Updates:       updates,
		})
	}

	// Sort ongoing points by StreetName alphabetically
	sort.Slice(ongoing, func(i, j int) bool {
		return ongoing[i].StreetName < ongoing[j].StreetName
	})

	return &InundationSummaryData{
		ActivePoints:  len(ongoing),
		OngoingPoints: ongoing,
	}, nil
}
