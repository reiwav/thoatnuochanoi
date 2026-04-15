package pumpingstation

import (
	"ai-api-tnhn/internal/base/mgo/filter"
	"ai-api-tnhn/internal/models"
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/utils/web"
	"context"
	"errors"
	"time"
)

type Service interface {
	Create(ctx context.Context, input *models.PumpingStation) (*models.PumpingStation, error)
	Update(ctx context.Context, id string, input *models.PumpingStation) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*models.PumpingStation, error)
	List(ctx context.Context, filter filter.Filter) ([]*models.PumpingStation, int64, error)
	GetOrgByID(ctx context.Context, id string) (*models.Organization, error)

	// History
	CreateHistory(ctx context.Context, user *models.User, history *models.PumpingStationHistory) (*models.PumpingStationHistory, error)
	ListHistory(ctx context.Context, filter filter.Filter) ([]*models.PumpingStationHistory, int64, error)

	SetWorker(w interface{})
}

type Worker interface {
	Restart(ctx context.Context)
}

type service struct {
	stationRepo repository.PumpingStation
	userRepo    repository.User
	orgRepo     repository.Organization
	worker      Worker
}

func NewService(stationRepo repository.PumpingStation, userRepo repository.User, orgRepo repository.Organization) Service {
	return &service{
		stationRepo: stationRepo,
		userRepo:    userRepo,
		orgRepo:     orgRepo,
	}
}

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

// History
func (s *service) CreateHistory(ctx context.Context, user *models.User, history *models.PumpingStationHistory) (*models.PumpingStationHistory, error) {
	// 1. Permission check: Employee can only update their assigned station
	if user != nil && user.IsEmployee {
		if user.AssignedPumpingStationID == "" {
			return nil, web.Forbidden("Bạn chưa được gán vào trạm bơm nào")
		}
		if history.StationID != user.AssignedPumpingStationID {
			return nil, web.Forbidden("Bạn không có quyền báo cáo cho trạm bơm này")
		}
	}

	// 2. Data validation
	station, err := s.stationRepo.GetByID(ctx, history.StationID)
	if err != nil || station == nil {
		return nil, errors.New("không tìm thấy trạm bơm")
	}

	totalReported := history.OperatingCount + history.ClosedCount + history.MaintenanceCount + history.NoSignalCount
	if totalReported > station.PumpCount {
		return nil, web.BadRequest("Tổng số lượng máy bơm báo cáo vượt quá số lượng thực tế của trạm")
	}

	// 3. Deduplication for automatic reports
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
				// No change in counts for auto-report, skip insert
				return latest, nil
			}
		}
	}

	// 4. Populate metadata
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
		// Update station with last report
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
