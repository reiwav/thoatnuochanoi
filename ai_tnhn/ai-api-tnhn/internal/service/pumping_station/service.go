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

	// History
	CreateHistory(ctx context.Context, user *models.User, history *models.PumpingStationHistory) (*models.PumpingStationHistory, error)
	ListHistory(ctx context.Context, filter filter.Filter) ([]*models.PumpingStationHistory, int64, error)
}

type service struct {
	stationRepo repository.PumpingStation
	userRepo    repository.User
}

func NewService(stationRepo repository.PumpingStation, userRepo repository.User) Service {
	return &service{
		stationRepo: stationRepo,
		userRepo:    userRepo,
	}
}

func (s *service) Create(ctx context.Context, input *models.PumpingStation) (*models.PumpingStation, error) {
	return s.stationRepo.Create(ctx, input)
}

func (s *service) Update(ctx context.Context, id string, input *models.PumpingStation) error {
	return s.stationRepo.Update(ctx, id, input)
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
	if user.Role == "employee" {
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

	totalReported := history.OperatingCount + history.ClosedCount + history.MaintenanceCount
	if totalReported > station.PumpCount {
		return nil, web.BadRequest("Tổng số lượng máy bơm báo cáo vượt quá số lượng thực tế của trạm")
	}

	// 3. Populate metadata
	history.UserID = user.ID
	history.UserName = user.Name
	if history.Timestamp == 0 {
		history.Timestamp = time.Now().Unix()
	}

	return s.stationRepo.CreateHistory(ctx, history)
}

func (s *service) ListHistory(ctx context.Context, filter filter.Filter) ([]*models.PumpingStationHistory, int64, error) {
	return s.stationRepo.ListHistory(ctx, filter)
}
