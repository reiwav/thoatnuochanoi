Tôi cần thêm menu "Bảng trạm bơm" tại giám sát với chức năng như sau:

### 1. Hiển thị danh sách trạm (Card Layout)
Thiết kế dạng Card đồng bộ với giao diện "Điểm trực ngập" để đảm bảo tính nhất quán:
- **Thông tin cơ bản**: Tên trạm (H4, Bold), Địa chỉ (Caption), Tổng số máy bơm.
- **Trạng thái hoạt động (Visualized)**: 
    * Hiển thị danh sách 4 trạng thái: Vận hành, Không vận hành, Bảo dưỡng, Mất kết nối.
    * Sử dụng dải màu hoặc Badge để phân biệt: Vận hành (Xanh), Không VH (Xám), Bảo dưỡng (Vàng), Mất kết nối (Đỏ).
- **Thời gian cập nhật**: Hiển thị thời gian từ lần báo cáo cuối cùng (Time ago).
- **Cảnh báo**: Nếu có máy bơm "Mất kết nối", card phải có dấu hiệu nhận biết nổi bật (ví dụ: Icon cảnh báo đỏ).

### 2. Chức năng Cập nhật (Popup)
Khi nhấn nút "Cập nhật", hiện Popup với các tính năng sau:
- **Thông tin so sánh**: Hiển thị số liệu hiện tại (Latest) ngay bên cạnh các ô nhập liệu để người dùng dễ đối chiếu.
- **Các trường nhập liệu**:
    * Số bơm vận hành
    * Số bơm không vận hành
    * Số bơm bảo dưỡng
    * Số bơm mất kết nối
    * Ghi chú bổ sung
- **Logic Validation**: 
    * Tổng 4 loại trạng thái máy bơm phải bằng chính xác số `Tổng máy bơm` của trạm. 
    * Nếu không khớp, hiển thị thông báo lỗi và không cho phép Lưu.
- **Tiện ích**: Bổ sung nút tăng/giảm (+/-) cho các ô nhập số lượng để thao tác nhanh.

### 3. Các chức năng bổ trợ khác
- **Lịch sử**: Nút xem lịch sử vận hành của riêng trạm đó.
- **Phân quyền**: Chỉ người có quyền `trambom:report` hoặc Admin mới thấy nút Cập nhật.