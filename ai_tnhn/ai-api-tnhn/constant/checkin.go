package constant

type CheckinStatus string

const (
	CheckinNone CheckinStatus = "NONE" // Chưa từng check
	CheckinIn   CheckinStatus = "IN"   // Đang ở trong
	CheckinOut  CheckinStatus = "OUT"  // Đã checkout
)

type CheckinAction string

const (
	CheckinActionIn  CheckinAction = "IN"
	CheckinActionOut CheckinAction = "OUT"
)
