package constant

type EventStatus string

const (
	EventPendingStatus   EventStatus = "PENDING"   // Đang xử lý
	EventStatusActive    EventStatus = "HAPPENING" // Đang diễn ra (alias for active)
	EventHappeningStatus EventStatus = "HAPPENING" // Đang diễn ra
	EventCloseStatus     EventStatus = "CLOSED"    // Đóng
)
