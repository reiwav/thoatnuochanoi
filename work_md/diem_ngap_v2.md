Chúng ta sẽ phải thiết kế lại điểm ngập, tại report_update nên tạo ìt field thôi, chủ yếu ghi log. thì chức năng mỗi nhóm thực hiện như sau.
1. Xí nghiệp địa bàn: báo cáo được điểm ngập (DxRxS), ghi chú, kết thúc điểm ngập, ghi chú
- Chỉnh sửa lại điểm ngập khi 
2. Kỹ thuật chất lượng: cũng báo cáo được điểm ngập ( DxRxS),up ảnh
- Cơ chế nhận xét điểm ngập của xí nghiệp địa bàn
3. Xí nghiệp khảo sát thiết kế:
- cũng báo cáo được điểm ngập ( DxRxS),up ảnh, ghi chú
4. Xí nghiệp cơ giới: cũng báo cáo được điểm ngập ( DxRxS),up ảnh, ghi chú

(có thể có nhiều đối tượng hơn nữa, nên tôi nghĩ chúng ta nên cho xử lý động. lưu tên nhân viên, xí nghiệp vào)
Chúng ta nên thêm role 1 báo cáo điểm ngập riêng cho địa bàn để nó show DxRxS và ảnh lên monitor của ngập (coi nó là chính, vì chỉ địa bàn mới làm nhiệm vụ chính của hệ thống điểm ngập)

Chúng ta đã thiết kế role nhận xét điểm ngập rồi nên nó có thể nhận xét điểm ngập của role địa bàn.

Mỗi đối tượng chỉ hiển thị ở khung của đối tượng đó

1. Làm 1 table mới inundation_history bỏ table report_update . Model cơ bản như sau:

type InundationHistory struct {
	ID            string  `json:"id"`
	UserId        string  `json:"user_id"`
	OrgId         string  `json:"org_id"`
	OrgName       string  `json:"org_name"`
	RolePermission string  `json:"role_permission"`
	Depth          float64 `json:"depth"`
	Width          string  `json:"width"`
	Length         string  `json:"length"`
	Images         []string `json:"images"`
	Note           string  `json:"note"`
    InundationId   string  `json:"inundation_id"`
	ReviewComment  string  `json:"review_comment"`
	NeedsCorrection bool    `json:"needs_correction"`
	CreatedAt      int64   `json:"created_at"`
	UpdatedAt      int64   `json:"updated_at"`
	DeletedAt      int64   `json:"deleted_at"`
}

