package utils

import (
	"testing"
	"time"
)

func TestVietnamLocation(t *testing.T) {
	if VietnamLocation == nil {
		t.Fatal("VietnamLocation is nil")
	}

	now := NowVietnam()
	_, offset := now.Zone()
	if offset != 7*3600 {
		t.Errorf("expected UTC+7 (25200s), got %d", offset)
	}
}

func TestFormatAndParseVietnamTime(t *testing.T) {
	testTime := time.Date(2026, 8, 15, 14, 30, 45, 0, VietnamLocation)

	dtStr := FormatDateTime(testTime)
	if dtStr != "2026-08-15 14:30:45" {
		t.Errorf("expected 2026-08-15 14:30:45, got %s", dtStr)
	}

	dStr := FormatDate(testTime)
	if dStr != "2026-08-15" {
		t.Errorf("expected 2026-08-15, got %s", dStr)
	}

	tStr := FormatTime(testTime)
	if tStr != "14:30" {
		t.Errorf("expected 14:30, got %s", tStr)
	}

	dispDate := FormatDisplayDate(testTime)
	if dispDate != "15/08/2026" {
		t.Errorf("expected 15/08/2026, got %s", dispDate)
	}

	dispDateTime := FormatDisplayDateTime(testTime)
	if dispDateTime != "15/08/2026 14:30:45" {
		t.Errorf("expected 15/08/2026 14:30:45, got %s", dispDateTime)
	}

	parsed, err := ParseVietnamTime(dtStr)
	if err != nil {
		t.Fatalf("ParseVietnamTime error: %v", err)
	}
	if parsed.Unix() != testTime.Unix() {
		t.Errorf("parsed time unix mismatch: expected %d, got %d", testTime.Unix(), parsed.Unix())
	}
}

func TestParseFlexibleTime(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"15/08/2026 09:30:00", "2026-08-15 09:30:00"},
		{"15/08/2026 09:30", "2026-08-15 09:30:00"},
		{"2026-08-15 09:30:00", "2026-08-15 09:30:00"},
		{"2026-08-15T09:30:00", "2026-08-15 09:30:00"},
		{"2026-08-15", "2026-08-15 00:00:00"},
	}

	for _, c := range cases {
		tVal := ParseFlexibleTime(c.input)
		res := FormatDateTime(tVal)
		if res != c.expected {
			t.Errorf("input %s: expected %s, got %s", c.input, c.expected, res)
		}
	}
}

func TestRainDateCutoff(t *testing.T) {
	// Before 7 AM (e.g. 6:59 AM on 2026-08-15) -> belongs to 2026-08-14
	tBefore := time.Date(2026, 8, 15, 6, 59, 0, 0, VietnamLocation)
	if rainDate := GetRainDate(tBefore); rainDate != "2026-08-14" {
		t.Errorf("before 7AM: expected 2026-08-14, got %s", rainDate)
	}

	// At 7:00 AM on 2026-08-15 -> belongs to 2026-08-15
	tAt := time.Date(2026, 8, 15, 7, 0, 0, 0, VietnamLocation)
	if rainDate := GetRainDate(tAt); rainDate != "2026-08-15" {
		t.Errorf("at 7AM: expected 2026-08-15, got %s", rainDate)
	}

	// After 7:00 AM on 2026-08-15 -> belongs to 2026-08-15
	tAfter := time.Date(2026, 8, 15, 15, 30, 0, 0, VietnamLocation)
	if rainDate := GetRainDate(tAfter); rainDate != "2026-08-15" {
		t.Errorf("after 7AM: expected 2026-08-15, got %s", rainDate)
	}
}
