package setting

import (
	"ai-api-tnhn/internal/base/mgo"
	"ai-api-tnhn/internal/base/model"
	"ai-api-tnhn/internal/models"
	"context"
	"testing"
	"time"
)

type mockWaterThresholdRepo struct {
	mgo.BaseTable
	settings []*models.WaterThresholdSetting
}

func (m *mockWaterThresholdRepo) GetActive(ctx context.Context, year int) (*models.WaterThresholdSetting, error) {
	for _, s := range m.settings {
		if s.Year == year && s.Status == "active" {
			return s, nil
		}
	}
	return nil, nil
}

func (m *mockWaterThresholdRepo) GetLatestActive(ctx context.Context) (*models.WaterThresholdSetting, error) {
	for _, s := range m.settings {
		if s.Status == "active" {
			return s, nil
		}
	}
	return nil, nil
}

func (m *mockWaterThresholdRepo) List(ctx context.Context, year int, status string) ([]*models.WaterThresholdSetting, error) {
	var res []*models.WaterThresholdSetting
	for _, s := range m.settings {
		if (year == 0 || s.Year == year) && (status == "" || s.Status == status) {
			res = append(res, s)
		}
	}
	return res, nil
}

func (m *mockWaterThresholdRepo) GetByID(ctx context.Context, id string) (*models.WaterThresholdSetting, error) {
	for _, s := range m.settings {
		if s.ID == id {
			return s, nil
		}
	}
	return nil, nil
}

func (m *mockWaterThresholdRepo) Create(ctx context.Context, setting *models.WaterThresholdSetting) error {
	setting.ID = "wts_test_" + setting.Name
	m.settings = append(m.settings, setting)
	return nil
}

func (m *mockWaterThresholdRepo) Update(ctx context.Context, setting *models.WaterThresholdSetting) error {
	for i, s := range m.settings {
		if s.ID == setting.ID {
			m.settings[i] = setting
			return nil
		}
	}
	return nil
}

func (m *mockWaterThresholdRepo) GetMaxVersion(ctx context.Context, year int) (int, error) {
	max := 0
	for _, s := range m.settings {
		if s.Year == year && s.Version > max {
			max = s.Version
		}
	}
	return max, nil
}

func (m *mockWaterThresholdRepo) ArchiveAllActive(ctx context.Context, year int) error {
	for _, s := range m.settings {
		if s.Year == year && s.Status == "active" {
			s.Status = "archived"
		}
	}
	return nil
}

func TestCalculateThresholdStatus(t *testing.T) {
	mockRepo := &mockWaterThresholdRepo{
		settings: []*models.WaterThresholdSetting{
			{
				BaseModel: model.BaseModel{ID: "wts_v1"},
				Year:      2026,
				Version:   1,
				Status:    "active",
				Thresholds: []models.Threshold{
					{
						Type:   models.SeasonTypeDry,
						Name:   "Mùa khô",
						Months: []int{1, 2, 3, 4, 11, 12},
					},
					{
						Type:   models.SeasonTypeRainy,
						Name:   "Mùa mưa",
						Months: []int{5, 6, 7, 8, 9, 10},
					},
				},
			},
		},
	}

	svc := NewWaterThresholdService(mockRepo, nil)
	ctx := context.Background()

	stationConfigs := []models.StationThresholdConfig{
		{
			ThresholdType: models.SeasonTypeDry,
			ThresholdName: "Mùa khô",
			MinLevel:      1.0,
			MaxLevel:      2.5,
		},
		{
			ThresholdType: models.SeasonTypeRainy,
			ThresholdName: "Mùa mưa",
			MinLevel:      2.0,
			MaxLevel:      4.0,
		},
	}

	tests := []struct {
		name           string
		timestamp      time.Time
		waterValue     float64
		expectedStatus string
		expectedMin    float64
		expectedMax    float64
	}{
		{
			name:           "Month 7 (Rainy Season) - Normal water level",
			timestamp:      time.Date(2026, 7, 15, 10, 0, 0, 0, time.UTC),
			waterValue:     3.0,
			expectedStatus: "normal",
			expectedMin:    2.0,
			expectedMax:    4.0,
		},
		{
			name:           "Month 7 (Rainy Season) - High water level alarm",
			timestamp:      time.Date(2026, 7, 15, 10, 0, 0, 0, time.UTC),
			waterValue:     4.5,
			expectedStatus: "high",
			expectedMin:    2.0,
			expectedMax:    4.0,
		},
		{
			name:           "Month 7 (Rainy Season) - Low water level alarm",
			timestamp:      time.Date(2026, 7, 15, 10, 0, 0, 0, time.UTC),
			waterValue:     1.5,
			expectedStatus: "low",
			expectedMin:    2.0,
			expectedMax:    4.0,
		},
		{
			name:           "Month 1 (Dry Season) - Normal water level",
			timestamp:      time.Date(2026, 1, 10, 8, 30, 0, 0, time.UTC),
			waterValue:     1.8,
			expectedStatus: "normal",
			expectedMin:    1.0,
			expectedMax:    2.5,
		},
		{
			name:           "Month 1 (Dry Season) - High water level alarm",
			timestamp:      time.Date(2026, 1, 10, 8, 30, 0, 0, time.UTC),
			waterValue:     3.0,
			expectedStatus: "high",
			expectedMin:    1.0,
			expectedMax:    2.5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, minVal, maxVal := svc.CalculateThresholdStatus(ctx, tt.timestamp, stationConfigs, tt.waterValue)
			if status != tt.expectedStatus {
				t.Errorf("Expected status %s, got %s", tt.expectedStatus, status)
			}
			if minVal != tt.expectedMin {
				t.Errorf("Expected min %f, got %f", tt.expectedMin, minVal)
			}
			if maxVal != tt.expectedMax {
				t.Errorf("Expected max %f, got %f", tt.expectedMax, maxVal)
			}
		})
	}
}

func TestStatusLifecycleAndVersioning(t *testing.T) {
	mockRepo := &mockWaterThresholdRepo{
		settings: []*models.WaterThresholdSetting{
			{
				BaseModel: model.BaseModel{ID: "wts_v1"},
				Year:      2026,
				Version:   1,
				Status:    "active",
			},
		},
	}

	svc := NewWaterThresholdService(mockRepo, nil)
	ctx := context.Background()
	user := &models.User{Name: "Admin User", Username: "admin"}

	// 1. Create new setting -> Status should be "new", Version should be 2
	newInput := &models.WaterThresholdSetting{
		Year: 2026,
		Name: "Cấu hình thử nghiệm v2",
	}
	created, err := svc.CreateSetting(ctx, newInput, user)
	if err != nil {
		t.Fatalf("CreateSetting failed: %v", err)
	}
	if created.Status != "new" {
		t.Errorf("Expected new setting status to be 'new', got '%s'", created.Status)
	}
	if created.Version != 2 {
		t.Errorf("Expected new setting version to be 2, got %d", created.Version)
	}

	// 2. Activate new setting -> Old active setting should become 'archived', new setting should become 'active'
	activated, err := svc.ActivateSetting(ctx, created.ID, user)
	if err != nil {
		t.Fatalf("ActivateSetting failed: %v", err)
	}
	if activated.Status != "active" {
		t.Errorf("Expected activated setting status to be 'active', got '%s'", activated.Status)
	}

	// Verify old setting v1 is archived
	oldV1, _ := mockRepo.GetByID(ctx, "wts_v1")
	if oldV1.Status != "archived" {
		t.Errorf("Expected old v1 setting to be 'archived', got '%s'", oldV1.Status)
	}
}
