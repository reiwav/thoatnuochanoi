package pumpingstation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/utils/web"
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *service) Create(ctx context.Context, input *models.PumpingStation) (*models.PumpingStation, error) {
	res, err := s.stationRepo.Create(ctx, input)
	if err == nil && s.worker != nil {
		s.worker.Restart(ctx)
	}
	return res, err
}

func (s *service) Update(ctx context.Context, id string, input *models.PumpingStation) error {
	err := s.stationRepo.Update(ctx, id, input)
	if err == nil && s.worker != nil {
		s.worker.Restart(ctx)
	}
	return err
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.stationRepo.Delete(ctx, id)
}

func (s *service) GetByID(ctx context.Context, id string) (*models.PumpingStation, error) {
	return s.stationRepo.GetByID(ctx, id)
}

func (s *service) List(ctx context.Context, filter filter.Filter) ([]*models.PumpingStation, int64, error) {
	return s.stationRepo.List(ctx, filter)
}

func (s *service) CreateHistory(ctx context.Context, user *models.User, history *models.PumpingStationHistory) (*models.PumpingStationHistory, error) {
	if user != nil && user.IsEmployee {
		if user.AssignedPumpingStationID == "" {
			return nil, web.Forbidden("Bạn chưa được gán vào trạm bơm nào")
		}
		if history.StationID != user.AssignedPumpingStationID {
			return nil, web.Forbidden("Bạn không có quyền báo cáo cho trạm bơm này")
		}
	}

	station, err := s.stationRepo.GetByID(ctx, history.StationID)
	if err != nil || station == nil {
		return nil, errors.New("không tìm thấy trạm bơm")
	}

	totalReported := history.OperatingCount + history.ClosedCount + history.MaintenanceCount + history.NoSignalCount
	if totalReported > station.PumpCount {
		return nil, web.BadRequest("Tổng số lượng máy bơm báo cáo vượt quá số lượng thực tế của trạm")
	}

	if user == nil {
		f := filter.NewPaginationFilter()
		f.Page = 1
		f.PerPage = 1
		f.AddWhere("station_id", "station_id", history.StationID)
		f.SetOrderBy("-timestamp")
		latestItems, _, err := s.stationRepo.ListHistory(ctx, f)
		if err == nil && len(latestItems) > 0 {
			latest := latestItems[0]
			if latest.OperatingCount == history.OperatingCount &&
				latest.ClosedCount == history.ClosedCount &&
				latest.MaintenanceCount == history.MaintenanceCount &&
				latest.NoSignalCount == history.NoSignalCount {
				// Cập nhật thời gian updated_at (MTime trong BaseModel) và timestamp mới nhất
				latest.BeforeUpdate()
				latest.Timestamp = history.Timestamp
				_ = s.stationRepo.UpdateHistory(ctx, latest)
				return latest, nil
			}
		}
	}

	if user != nil {
		history.UserID = user.ID
		history.UserName = user.Name
	} else {
		history.UserID = "SYSTEM"
		history.UserName = "Hệ thống tự động"
		history.Note = "Dữ liệu tự động từ hệ thống"
	}

	if history.Timestamp == 0 {
		history.Timestamp = time.Now().Unix()
	}

	res, err := s.stationRepo.CreateHistory(ctx, history)
	if err == nil {
		station.LastReport = res
		_ = s.stationRepo.Update(ctx, station.ID, station)
	}
	return res, err
}

func (s *service) ListHistory(ctx context.Context, filter filter.Filter) ([]*models.PumpingStationHistory, int64, error) {
	return s.stationRepo.ListHistory(ctx, filter)
}

func (s *service) GetOrgByID(ctx context.Context, id string) (*models.Organization, error) {
	return s.orgRepo.GetByID(ctx, id)
}

func (s *service) SetWorker(w interface{}) {
	if worker, ok := w.(Worker); ok {
		s.worker = worker
	}
}

func (s *service) GetPumpingStationSummary(ctx context.Context, orgID string, assignedIDs []string) (*PumpingStationSummaryData, error) {
	f := filter.NewBasicFilter()
	if orgID != "" {
		f.AddWhere("org_wrapper", "$or", []bson.M{{"org_id": orgID}, {"shared_org_ids": orgID}})
	}
	if len(assignedIDs) > 0 {
		f.AddWhere("id_in", "_id", bson.M{"$in": assignedIDs})
	}

	stations, _, err := s.List(ctx, f)
	if err != nil {
		return nil, err
	}

	orgs, _, _ := s.orgRepo.List(ctx, filter.NewPaginationFilter())
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
			Priority:         st.Priority,
			OrgName:          orgMap[st.OrgID],
			PumpCount:        st.PumpCount,
			OperatingCount:   ops,
			ClosedCount:      closed,
			MaintenanceCount: maint,
			Note:             note,
			LastUpdate:       lastUpdate,
		})
	}

	sort.Slice(stationStats, func(i, j int) bool {
		if stationStats[i].Priority != stationStats[j].Priority {
			return stationStats[i].Priority < stationStats[j].Priority
		}
		return stationStats[i].Name < stationStats[j].Name
	})

	var stInfos []string
	for _, st := range stationStats {
		if st.OperatingCount == 0 {
			continue
		}
		stInfos = append(stInfos, fmt.Sprintf("%s: %d/%d đang vận hành, cập nhật lúc: %s.", st.Name, st.OperatingCount, st.PumpCount, st.LastUpdate))
	}

	summaryText := "Hiện tại không ghi nhận trạm bơm nào đang vận hành."
	if len(stInfos) > 0 {
		summaryText = strings.Join(stInfos, "\n")
	}

	return &PumpingStationSummaryData{
		TotalStations:       len(stations),
		TotalPumps:          totalPumps,
		TotalOperatingPumps: totalOperating,
		Stations:            stationStats,
		SummaryText:         summaryText,
	}, nil
}
