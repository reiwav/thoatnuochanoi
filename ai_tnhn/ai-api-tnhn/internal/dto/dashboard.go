package dto

// OverviewStats represents dashboard overview statistics
type OverviewStats struct {
	TotalEvents    int64   `json:"total_events"`
	ActiveEvents   int64   `json:"active_events"`
	TotalAttendees int64   `json:"total_attendees"`
	CheckedInCount int64   `json:"checked_in_count"`
	CheckInRate    float64 `json:"check_in_rate"`
	ActiveSessions int64   `json:"active_sessions"`
}

// EventAnalytics represents detailed analytics for a single event
type EventAnalytics struct {
	EventID            string           `json:"event_id"`
	EventName          string           `json:"event_name"`
	TotalRegistered    int64            `json:"total_registered"`
	TotalCheckedIn     int64            `json:"total_checked_in"`
	CheckInRate        float64          `json:"check_in_rate"`
	TierDistribution   map[string]int64 `json:"tier_distribution"`
	SourceDistribution map[string]int64 `json:"source_distribution"`
	SessionCount       int64            `json:"session_count"`
}

// CheckInTimelineItem represents check-in count at a specific time
type CheckInTimelineItem struct {
	Timestamp int64  `json:"timestamp"`
	Date      string `json:"date"`
	Count     int64  `json:"count"`
}

// SessionComparisonItem represents analytics for a single session
type SessionComparisonItem struct {
	SessionID   string  `json:"session_id"`
	SessionName string  `json:"session_name"`
	Registered  int64   `json:"registered"`
	CheckedIn   int64   `json:"checked_in"`
	CheckInRate float64 `json:"check_in_rate"`
}

// RecentCheckIn represents a recent check-in entry for live feed
type RecentCheckIn struct {
	CustomerID   string `json:"customer_id"`
	CustomerName string `json:"customer_name"`
	Photo        string `json:"photo"`
	Tier         string `json:"tier"`
	CheckInTime  int64  `json:"check_in_time"`
}
