package weather

import (
	"context"
	"testing"
)

func TestGetRawRainData_Real(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	svc := NewService(nil)
	ctx := context.Background()

	t.Log("Attempting to fetch raw rain data from real API...")
	data, err := svc.GetRawRainData(ctx)
	if err != nil {
		t.Fatalf("Failed to fetch raw rain data: %v", err)
	}

	if data == nil {
		t.Fatal("Expected data to be returned, got nil")
	}

	if data.Code != 200 && data.Code != 0 {
		t.Logf("Unexpected response code: %d", data.Code)
	}

	t.Logf("Fetched %d stations and %d measurements", len(data.Content.Tram), len(data.Content.Data))
}

func TestGetRawWaterData_Real(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	svc := NewService(nil)
	ctx := context.Background()

	t.Log("Attempting to fetch raw water data from real API...")
	data, err := svc.GetRawWaterData(ctx)
	if err != nil {
		t.Fatalf("Failed to fetch raw water data: %v", err)
	}

	if data == nil {
		t.Fatal("Expected data to be returned, got nil")
	}

	if data.Code != 200 && data.Code != 0 {
		t.Logf("Unexpected response code: %d", data.Code)
	}

	t.Logf("Fetched %d stations and %d measurements", len(data.Content.Tram), len(data.Content.Data))
}
