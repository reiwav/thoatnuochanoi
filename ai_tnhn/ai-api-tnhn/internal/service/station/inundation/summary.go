package inundation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"context"
	"fmt"
	"sort"
	"strings"
	"time"
)

func (s *service) GetInundationSummary(ctx context.Context, orgID string, isAllowedAll bool, assignedInuIDs []string) (*InundationSummaryData, error) {
	dummyUser := &models.User{
		OrgID:                        orgID,
		AssignedInundationStationIDs: assignedInuIDs,
		IsEmployee:                   !isAllowedAll && len(assignedInuIDs) > 0,
	}
	f := filter.NewPaginationFilter()
	f.Page = 1
	f.PerPage = 1000
	f.AddWhere("status", "status", "active")

	reports, _, err := s.ListReportsWithFilter(ctx, dummyUser, isAllowedAll, orgID, f)
	if err != nil {
		return nil, err
	}

	orgs, _ := s.orgRepo.GetAll(ctx)
	orgMap := make(map[string]string)
	for _, org := range orgs {
		orgMap[org.ID] = org.Name
	}

	var ongoing []InundationStationStat
	var detailStrings []string

	for _, r := range reports {
		depthInfo := fmt.Sprintf("%v x %v x %.2f", r.Length, r.Width, r.Depth)
		if r.Length == "" && r.Width == "" && r.Depth == 0 {
			depthInfo = "chưa rõ độ sâu"
		} else {
			depthInfo = "ngập " + depthInfo
		}

		var updates []InundationUpdateStat
		for _, u := range r.Updates {
			updates = append(updates, InundationUpdateStat{
				Timestamp:   time.Unix(u.Timestamp, 0).Format("15:04 02/01/2006"),
				Description: u.Description,
				Depth:       u.Depth,
			})
		}

		stat := InundationStationStat{
			StreetName:     r.StreetName,
			OrgName:        orgMap[r.OrgID],
			Depth:          r.Depth,
			Width:          r.Width,
			Length:         r.Length,
			FormattedDepth: depthInfo,
			StartTime:      time.Unix(r.CTime, 0).Format("15:04 02/01/2006"),
			Description:    r.Description,
			CurrentStatus:  "Đang ngập lụt",
			Updates:        updates,
		}
		ongoing = append(ongoing, stat)
		detailStrings = append(detailStrings, fmt.Sprintf("%s (%s)", stat.StreetName, depthInfo))
	}

	sort.Slice(ongoing, func(i, j int) bool {
		return ongoing[i].StreetName < ongoing[j].StreetName
	})

	summaryText := "không xuất hiện điểm úng ngập"
	if len(ongoing) > 0 {
		summaryText = fmt.Sprintf("có %d điểm úng ngập", len(ongoing))
	}

	return &InundationSummaryData{
		ActivePoints:  len(ongoing),
		SummaryText:   summaryText,
		FullSummary:   strings.Join(detailStrings, ", "),
		OngoingPoints: ongoing,
	}, nil
}
