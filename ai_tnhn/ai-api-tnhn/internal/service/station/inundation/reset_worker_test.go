package inundation

import (
	"ai-api-tnhn/internal/repository"
	"context"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
)

type mockInundationStationRepo struct {
	repository.InundationStation
	updateAllCalled bool
	filterPassed    bson.M
	updatePassed    interface{}
	errToReturn     error
}

func (m *mockInundationStationRepo) R_UpdateAll(ctx context.Context, filter bson.M, update interface{}) error {
	m.updateAllCalled = true
	m.filterPassed = filter
	m.updatePassed = update
	return m.errToReturn
}

func TestResetNotFloodedPoints(t *testing.T) {
	mockRepo := &mockInundationStationRepo{}
	svc := &service{
		inundationStationRepo: mockRepo,
		hub:                   NewHub(),
	}

	ctx := context.Background()
	svc.resetNotFloodedPoints(ctx)

	if !mockRepo.updateAllCalled {
		t.Fatal("Expected R_UpdateAll to be called")
	}

	// Verify filter matches report_id being empty/nil/non-existent
	orSlice, ok := mockRepo.filterPassed["$or"].([]bson.M)
	if !ok || len(orSlice) != 3 {
		t.Fatalf("Expected filter to have $or with 3 clauses, got: %v", mockRepo.filterPassed)
	}

	// Verify update sets last_report_id to ""
	updateVal, ok := mockRepo.updatePassed.(bson.M)
	if !ok {
		t.Fatalf("Expected update to be bson.M, got: %T", mockRepo.updatePassed)
	}
	if val, exists := updateVal["last_report_id"]; !exists || val != "" {
		t.Errorf("Expected update to contain last_report_id: \"\", got: %v", updateVal)
	}
}
