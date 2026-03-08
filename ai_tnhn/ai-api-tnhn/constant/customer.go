package constant

type CustomerSource string

const (
	CustomerSourceWalkIn CustomerSource = "WALK_IN" // Khách vãng lai (public register)
	CustomerSourceImport CustomerSource = "IMPORT"  // Import từ Excel
	CustomerSourceManual CustomerSource = "MANUAL"  // Tạo tay trong admin
	CustomerSourceFaceAI CustomerSource = "FACEAI"  // Tạo tự động từ Face AI
)

type CustomerStatus string

const (
	CustomerStatusPending  CustomerStatus = "PENDING"  // Chờ duyệt
	CustomerStatusApproved CustomerStatus = "APPROVED" // Đã duyệt
	CustomerStatusRejected CustomerStatus = "REJECTED" // Từ chối
	CustomerStatusSynced   CustomerStatus = "SYNCED"   // Đã sync xuống thiết bị
	CustomerStatusDisabled CustomerStatus = "DISABLED" // Vô hiệu hoá
)
