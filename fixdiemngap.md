# Kế hoạch triển khai: Quản lý Trạng thái Ngập cho Điểm Ngập (Inundation Station)

## 1. Mục tiêu
- Đồng bộ trạng thái ngập hiện tại từ bảng `inundation_reports` sang bảng `inundation_stations` thông qua trường `report_id`.
- Hiển thị bảng danh sách điểm ngập thông minh: chỉ hiện dropdown thao tác khi điểm đó đang có báo cáo ngập ("Đang ngập").

## 2. Thay đổi Backend

### 2.1. Cập nhật Model
- **File**: `internal/models/station.go` (Struct `InundationStation`)
- **Nội dung**: Thêm trường `ReportID string `json:"report_id" bson:"report_id"``. Trường này sẽ lưu ID của báo cáo ngập đang hoạt động.

### 2.2. Cập nhật Logic Service (Inundation Service)
- **File**: `internal/service/inundation/service.go`
- **Các hàm cần sửa đổi**:
    - **Hàm CreateReport**: Khi một báo cáo mới được tạo với trạng thái "active" (Đang ngập), cập nhật `ReportID` của `inundation_stations` tương ứng bằng `ID` của báo cáo vừa tạo.
    - **Hàm UpdateReport / ResolveReport**: 
        - Nếu báo cáo được cập nhật thành "resolved" (Đã hết ngập), cập nhật `ReportID` trong `inundation_stations` về `null` hoặc chuỗi rỗng.
        - Đảm bảo tính nhất quán: Nếu có nhiều báo cáo cho cùng 1 điểm (hiếm khi xảy ra đồng thời), `ReportID` phải luôn phản ánh báo cáo "active" mới nhất.

## 3. Thay đổi Frontend

### 3.1. Cập nhật API/Store
- Đảm bảo API lấy danh sách `inundation_stations` trả về thêm trường `report_id`.

### 3.2. Cập nhật UI (Inundation Station Table)
- **File**: `src/views/admin/inundation/InundationAdminList.jsx` (hoặc file tương ứng hiển thị bảng điểm ngập).
- **Logic hiển thị cột Thao tác**: 
    - Kiểm tra giá trị `item.report_id`.
    - **Nếu `report_id` có giá trị**: Hiển thị Dropdown menu (chứa các tác vụ như Xem chi tiết báo cáo, Cập nhật tiến độ, Kết thúc ngập).
    - **Nếu `report_id` là null**: Không hiển thị Dropdown và chỉ hiển thị nút "Tạo báo cáo mới"
    - Thêm chỉ báo hình ảnh (ví dụ: Icon màu đỏ hoặc Badge "Đang ngập") bên cạnh tên trạm nếu `report_id` khác null.
