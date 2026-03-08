package constant

type SyncStatus int

const (
	SyncPending SyncStatus = iota // vừa tạo, chưa đẩy
	SyncSending                   // đang gửi
	SyncSuccess                   // device xác nhận OK
	SyncFailed                    // device trả fail
	SyncTimeout                   // quá thời gian
)
