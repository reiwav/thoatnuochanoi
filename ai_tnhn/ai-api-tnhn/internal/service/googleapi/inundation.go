package googleapi

import (
	"context"
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
	StartTime     string                 `json:"start_time"`
	Description   string                 `json:"description"`
	CurrentStatus string                 `json:"current_status"`
	Updates       []InundationUpdateStat `json:"updates"`
}

type InundationSummaryData struct {
	ActivePoints  int                   `json:"active_points"`
	OngoingPoints []InundationStationStat `json:"ongoing_points"`
}

func (s *service) GetInundationSummary(ctx context.Context) (*InundationSummaryData, error) {
	reports, _, err := s.inuSvc.ListReports(ctx, "")
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
		if r.Status == "active" {
			var updates []InundationUpdateStat
			if fullReport, err := s.inuSvc.GetReport(ctx, r.ID); err == nil && fullReport != nil {
				for _, u := range fullReport.Updates {
					updates = append(updates, InundationUpdateStat{
						Timestamp:   time.Unix(u.Timestamp, 0).Format("15:04 02/01/2006"),
						Description: u.Description,
						Depth:       u.Depth,
					})
				}
			}

			ongoing = append(ongoing, InundationStationStat{
				StreetName:    r.StreetName,
				OrgName:       orgMap[r.OrgID],
				Depth:         r.Depth,
				StartTime:     time.Unix(r.StartTime, 0).Format("15:04 02/01/2006"),
				Description:   r.Description,
				CurrentStatus: "Đang ngập lụt, chưa kết thúc",
				Updates:       updates,
			})
		}
	}

	return &InundationSummaryData{
		ActivePoints:  len(ongoing),
		OngoingPoints: ongoing,
	}, nil
}
