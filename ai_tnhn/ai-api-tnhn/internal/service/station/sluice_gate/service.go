package sluice_gate

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type Service interface {
	Create(ctx context.Context, m *models.SluiceGate) (*models.SluiceGate, error)
	Get(ctx context.Context, id string) (*models.SluiceGate, error)
	Update(ctx context.Context, id string, m *models.SluiceGate) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, f filter.Filter) ([]*models.SluiceGate, int64, error)
	
	Report(ctx context.Context, id string, m *models.SluiceGateHistory) error
	ListHistory(ctx context.Context, id string, f filter.Filter) ([]*models.SluiceGateHistory, int64, error)
	GetSluiceGateSummary(ctx context.Context, orgID string, assignedIDs []string) (*SluiceGateSummaryData, error)
}

type service struct {
	repo    repository.SluiceGate
	orgRepo repository.Organization
}

func NewService(repo repository.SluiceGate, orgRepo repository.Organization) Service {
	return &service{repo: repo, orgRepo: orgRepo}
}

func (s *service) Create(ctx context.Context, m *models.SluiceGate) (*models.SluiceGate, error) {
	return s.repo.Create(ctx, m)
}

func (s *service) Get(ctx context.Context, id string) (*models.SluiceGate, error) {
	return s.repo.Get(ctx, id)
}

func (s *service) Update(ctx context.Context, id string, m *models.SluiceGate) error {
	return s.repo.Update(ctx, id, m)
}

func (s *service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *service) List(ctx context.Context, f filter.Filter) ([]*models.SluiceGate, int64, error) {
	return s.repo.List(ctx, f)
}

func (s *service) Report(ctx context.Context, id string, m *models.SluiceGateHistory) error {
	m.SluiceGateID = id
	err := s.repo.CreateHistory(ctx, m)
	if err != nil {
		return err
	}
	
	gate, err := s.repo.Get(ctx, id)
	if err == nil && gate != nil {
		gate.Doors = m.Doors
		gate.LastReport = m
		_ = s.repo.Update(ctx, id, gate)
	}
	return nil
}

func (s *service) ListHistory(ctx context.Context, id string, f filter.Filter) ([]*models.SluiceGateHistory, int64, error) {
	f.AddWhere("sluice_gate_id", "sluice_gate_id", id)
	return s.repo.ListHistory(ctx, f)
}

func (s *service) GetSluiceGateSummary(ctx context.Context, orgID string, assignedIDs []string) (*SluiceGateSummaryData, error) {
	f := filter.NewBasicFilter()
	if orgID != "" {
		f.AddWhere("org_wrapper", "$or", []bson.M{{"org_id": orgID}, {"shared_org_ids": orgID}, {"share_all": true}})
	}
	if len(assignedIDs) > 0 {
		f.AddWhere("id_in", "_id", bson.M{"$in": assignedIDs})
	}
	f.AddSort("priority", -1)
	f.AddSort("name", 1)

	gates, _, err := s.List(ctx, f)
	if err != nil {
		return nil, err
	}

	orgs, _, _ := s.orgRepo.List(ctx, filter.NewPaginationFilter())
	orgMap := make(map[string]string)
	for _, org := range orgs {
		orgMap[org.ID] = org.Name
	}

	var totalGates, totalOpenGates, totalDoors, totalOpenDoors int
	var gateStats []SluiceGateStat

	for _, st := range gates {
		lastUpdate := "-"
		note := "-"
		openCount := 0

		for _, d := range st.Doors {
			if d {
				openCount++
			}
		}

		closedCount := st.Quantity - openCount
		if closedCount < 0 {
			closedCount = 0
		}

		if st.LastReport != nil {
			if st.LastReport.Note != "" {
				note = st.LastReport.Note
			}
			lastUpdate = time.Unix(st.LastReport.Timestamp, 0).In(time.FixedZone("ICT", 7*3600)).Format("15:04 02/01/2006")
		}

		if openCount > 0 {
			totalOpenGates++
		}
		totalDoors += st.Quantity
		totalOpenDoors += openCount
		totalGates++

		gateStats = append(gateStats, SluiceGateStat{
			ID:          st.ID,
			Name:        st.Name,
			Priority:    st.Priority,
			OrgName:     orgMap[st.OrgID],
			Quantity:    st.Quantity,
			OpenCount:   openCount,
			ClosedCount: closedCount,
			Note:        note,
			LastUpdate:  lastUpdate,
		})
	}

	summaryText := "Hiện tại không ghi nhận cửa phai nào đang mở."
	if totalOpenGates > 0 {
		summaryText = fmt.Sprintf("Hiện tại có %d cửa phai đang mở để đảm bảo điều tiết nước thoát.", totalOpenGates)
	}

	summaryPriorityText := "Hiện tại không ghi nhận cửa phai nào đang mở."
	var priorities []string
	for _, st := range gateStats {
		if st.OpenCount == 0 {
			continue
		}
		txt := fmt.Sprintf("%s: mở %d/%d cửa, cập nhật lúc: %s.", st.Name, st.OpenCount, st.Quantity, st.LastUpdate)
		if st.Priority > 0 {
			priorities = append(priorities, txt)
		}
	}
	if len(priorities) > 0 {
		summaryPriorityText = strings.Join(priorities, ", ")
	}

	return &SluiceGateSummaryData{
		TotalGates:          totalGates,
		TotalOpenGates:      totalOpenGates,
		TotalDoors:          totalDoors,
		TotalOpenDoors:      totalOpenDoors,
		Gates:               gateStats,
		SummaryText:         summaryText,
		SummaryPriorityText: summaryPriorityText,
	}, nil
}
