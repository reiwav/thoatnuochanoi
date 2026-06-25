package utils

import (
	"ai-api-tnhn/utils/web"
	"time"
)

var VietnamTZ = time.FixedZone("Asia/Ho_Chi_Minh", 7*60*60)

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
			vnTime := t.In(VietnamTZ)
			return vnTime.Format("2006-01-02T15:04:05")
		}
	}
	return utcStr
}

func ParseTime(s string) (time.Time, error) {
	layouts := []string{"2006-01-02T15:04:05", "2006-01-02 15:04:05", "02/01/2006 15:04:05", "02/01/2006 15:04", time.RFC3339}
	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, s, VietnamTZ); err == nil {
			return t, nil
		}
	}
	return time.Time{}, web.BadRequest("unable to parse time: " + s)
}

// GetRainDate returns the rain day date string (YYYY-MM-DD) for a given time based on the 7 AM cutoff.
func GetRainDate(t time.Time) string {
	tLocal := t.In(VietnamTZ)
	cutoff := time.Date(tLocal.Year(), tLocal.Month(), tLocal.Day(), 7, 0, 0, 0, VietnamTZ)
	if tLocal.Before(cutoff) {
		return tLocal.AddDate(0, 0, -1).Format("2006-01-02")
	}
	return tLocal.Format("2006-01-02")
}

// CurrentRainDate returns the current active rain day date string (YYYY-MM-DD).
func CurrentRainDate() string {
	return GetRainDate(time.Now())
}
