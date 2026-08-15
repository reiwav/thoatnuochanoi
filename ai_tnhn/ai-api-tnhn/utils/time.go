package utils

import (
	"ai-api-tnhn/utils/web"
	"strings"
	"time"
)

// VietnamLocation is the singleton time.Location for Vietnam (Asia/Ho_Chi_Minh / UTC+7)
var VietnamLocation = func() *time.Location {
	loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err != nil {
		loc = time.FixedZone("Asia/Ho_Chi_Minh", 7*60*60)
	}
	return loc
}()

// VietnamTZ is an alias of VietnamLocation for backward compatibility
var VietnamTZ = VietnamLocation

// NowVietnam returns the current time in Vietnam timezone
func NowVietnam() time.Time {
	return time.Now().In(VietnamLocation)
}

// ToVietnam converts any time.Time to Vietnam timezone
func ToVietnam(t time.Time) time.Time {
	return t.In(VietnamLocation)
}

// TodayVietnam returns today's date string in YYYY-MM-DD format in Vietnam timezone
func TodayVietnam() string {
	return NowVietnam().Format("2006-01-02")
}

// FormatDateTime formats time in "2006-01-02 15:04:05" layout in Vietnam timezone
func FormatDateTime(t time.Time) string {
	return t.In(VietnamLocation).Format("2006-01-02 15:04:05")
}

// FormatDate formats time in "2006-01-02" layout in Vietnam timezone
func FormatDate(t time.Time) string {
	return t.In(VietnamLocation).Format("2006-01-02")
}

// FormatTime formats time in "15:04" layout in Vietnam timezone
func FormatTime(t time.Time) string {
	return t.In(VietnamLocation).Format("15:04")
}

// FormatDisplayDate formats time in "02/01/2006" (DD/MM/YYYY) layout in Vietnam timezone
func FormatDisplayDate(t time.Time) string {
	return t.In(VietnamLocation).Format("02/01/2006")
}

// FormatDisplayDateTime formats time in "02/01/2006 15:04:05" layout in Vietnam timezone
func FormatDisplayDateTime(t time.Time) string {
	return t.In(VietnamLocation).Format("02/01/2006 15:04:05")
}

// ParseVietnamTime parses a time string using candidate formats in Vietnam timezone
func ParseVietnamTime(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	layouts := []string{
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
		"02/01/2006 15:04:05",
		"02/01/2006 15:04",
		"2006-01-02",
		"02/01/2006",
		time.RFC3339,
	}
	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, s, VietnamLocation); err == nil {
			return t, nil
		}
	}
	return time.Time{}, web.BadRequest("unable to parse time: " + s)
}

// ParseFlexibleTime parses a time string from external sources with fallback to NowVietnam()
func ParseFlexibleTime(s string) time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return NowVietnam()
	}

	layouts := []string{
		"02/01/2006 15:04:05",
		"02/01/2006 15:04",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
		"2006-01-02",
		"02/01/2006",
		time.RFC3339,
	}

	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, s, VietnamLocation); err == nil {
			return t
		}
	}

	return NowVietnam()
}

// ConvertUTCToVietnam converts a UTC timestamp string to Vietnam timezone (UTC+7).
// Input format: "2006-01-02T15:04:05" or "2006-01-02 15:04:05"
// Output format: "2006-01-02T15:04:05" (Vietnam local time)
func ConvertUTCToVietnam(utcStr string) string {
	if utcStr == "" || utcStr == "-" {
		return utcStr
	}
	layouts := []string{
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
	}
	for _, layout := range layouts {
		t, err := time.Parse(layout, utcStr)
		if err == nil {
			vnTime := t.In(VietnamLocation)
			return vnTime.Format("2006-01-02T15:04:05")
		}
	}
	return utcStr
}

// GetRainDate returns the rain day date string (YYYY-MM-DD) for a given time based on the 7 AM cutoff.
func GetRainDate(t time.Time) string {
	tLocal := t.In(VietnamLocation)
	cutoff := time.Date(tLocal.Year(), tLocal.Month(), tLocal.Day(), 7, 0, 0, 0, VietnamLocation)
	if tLocal.Before(cutoff) {
		return tLocal.AddDate(0, 0, -1).Format("2006-01-02")
	}
	return tLocal.Format("2006-01-02")
}

// CurrentRainDate returns the current active rain day date string (YYYY-MM-DD).
func CurrentRainDate() string {
	return GetRainDate(time.Now())
}
