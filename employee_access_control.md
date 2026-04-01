# Kế hoạch Chi tiết: Phân quyền Truy cập cho Vai trò Nhân viên (Employee)

## 1. Mục tiêu
Đảm bảo nhân viên (role = `employee`) chỉ có thể xem và gửi báo cáo cho các **Điểm ngập lụt** và **Công trình khẩn cấp** mà họ được giao nhiệm vụ. Các vai trò cao hơn (`super_admin`, `admin_org`, `manager`) vẫn có quyền xem toàn bộ theo phạm vi tổ chức của họ.

## 2. Thay đổi Backend (Go API)

### 2.1. Cập nhật Model Người dùng
Thêm các trường danh sách ID được phân quyền vào struct `User` trong `internal/models/user.go`:
- `AssignedInundationPointIDs []string` (BSON/JSON: `assigned_inundation_point_ids`)
- `AssignedEmergencyConstructionIDs []string` (BSON/JSON: `assigned_emergency_construction_ids`)

### 2.2. Cập nhật logic lọc dữ liệu (Handlers/Filters)

#### A. Đối với Báo cáo Ngập lụt (`handler/inundation.go`)
- **`ListReports`**: Nếu user là `employee`, thêm điều kiện lọc `point_id` nằm trong danh sách `AssignedInundationPointIDs`.
- **`GetPointsStatus`**: Chỉ trả về trạng thái của các điểm mà nhân viên được giao.
- **`CreateReport` / `AddUpdateSituation`**: Validate xem `point_id` gửi lên có thuộc quyền hạn của nhân viên đó không.

#### B. Đối với Công trình khẩn cấp (`handler/emergency_construction.go`)
- **`List`**: Nếu user là `employee`, thêm điều kiện lọc `id` nằm trong danh sách `AssignedEmergencyConstructionIDs`.
- **`ReportProgress`**: Validate xem `construction_id` có thuộc danh sách được giao không.
- **`GetProgressHistory` / `ListHistory`**: Lọc theo danh sách công trình được giao.

### 2.3. Cập nhật API Quản lý Nhân viên (`handler/employee.go`)
- Bổ sung chức năng cập nhật danh sách quyền hạn (assign/unassign points/stations) cho nhân viên. Chức năng này chỉ dành cho `admin_org`.

## 3. Thay đổi Frontend (React AI-Frontend)

### 3.1. Quản lý Nhân viên (Dành cho Quản trị viên/Quản lý)
- Trong trang chỉnh sửa thông tin nhân viên, thay thế MUI Select (Dropdown) bằng **Popup Selection Dialog**:
    - Hiển thị danh sách tóm tắt (hoặc số lượng) các điểm đã chọn kèm nút "Thay đổi".
    - Khi nhấn vào sẽ mở một Popup (Dialog) có:
        - Thanh tìm kiếm (Search bar) để tìm nhanh địa điểm/công trình.
        - Danh sách có tích chọn (Checkboxes).
        - Nút "Chọn tất cả" / "Bỏ chọn tất cả".
    - Điều này giúp quản lý dễ dàng thao tác khi danh sách có hàng chục hoặc hàng trăm mục.
- Gọi API cập nhật mới để lưu thông tin này vào database.

### 3.2. Giao diện Nhân viên
- **Dashboard/Trang chủ**: Cập nhật các component đếm số lượng hoặc danh sách để chỉ hiển thị các mục thuộc quyền hạn.
- **Form Báo cáo**:
    - Trong `InundationReportPanel.jsx`, nếu user là `employee`, danh sách chọn địa điểm/điểm ngập chỉ hiển thị các điểm được giao.
    - Trong `ConstructionForm.jsx`, đảm bảo nhân viên chỉ thấy dữ liệu của công trình mình phụ trách.

## 4. Các bước triển khai (Workflow)

1.  **Bước 1 (Backend)**: Sửa model `User`, cập nhật logic DB (Repository/Service) để lưu và truy xuất các trường mới.
2.  **Bước 2 (Backend)**: Sửa Handler của Inundation và Emergency Construction để thực hiện logic lọc dựa trên JWT Token (UserID -> Fetch User -> Check permissions).
3.  **Bước 3 (Backend)**: Cập nhật API quản lý nhân viên để hỗ trợ phân quyền.
4.  **Bước 4 (Frontend)**: Cập nhật UI quản lý nhân viên để Admin có thể giao việc.
5.  **Bước 5 (Frontend)**: Cập nhật các màn hình hiển thị của Nhân viên để áp dụng bộ lọc mới.

## 5. Lưu ý bảo mật
- Việc lọc dữ liệu **PHẢI** thực hiện ở Backend (tại layer Handler hoặc Service) dựa trên UserId lấy từ JWT. Không được chỉ lọc ở Frontend vì người dùng có thể gọi trực tiếp API.
- Cần xử lý trường hợp danh sách quyền hạn trống (mặc định không xem được gì hoặc xem tất cả - tùy thuộc vào yêu cầu nghiệp vụ cụ thể, thường là không xem được gì).