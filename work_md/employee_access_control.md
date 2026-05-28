# Kế hoạch Chi tiết: Phân quyền Truy cập cho Vai trò Nhân viên (Employee)

## 1. Mục tiêu
Đảm bảo nhân viên (role = `employee`) chỉ có thể xem và gửi báo cáo cho các **Điểm ngập lụt** và **Công trình khẩn cấp** mà họ được giao nhiệm vụ. Các vai trò cao hơn (`super_admin`, `admin_org`, `manager`) vẫn có quyền xem toàn bộ theo phạm vi tổ chức của họ.

## 2. Ràng buộc Nghiệp vụ (Quan trọng)
- **Số lượng gán tối đa**: Mỗi nhân viên (`role = employee`) chỉ được phép gán **TỐI ĐA 1** Điểm ngập lụt (`InundationPoint`) và **TỐI ĐA 1** Công trình khẩn cấp.
- **Kiểu dữ liệu**: Vẫn sử dụng kiểu mảng (`string[]`) để linh hoạt cho tương lai, nhưng logic validation tại backend và UI tại frontend sẽ giới hạn chỉ cho phép chọn 1 phần tử.
- **Tính Duy nhất**: Mỗi Điểm ngập lụt hoặc Công trình khẩn cấp chỉ được phép gán cho **DUY NHẤT một nhân viên** tại một thời điểm trong cùng một tổ chức (`org_id`).
- **Không trùng lặp**: Hệ thống phải ngăn chặn việc gán cùng một địa điểm/công trình cho hai nhân viên khác nhau.

## 3. Thay đổi Backend (Go API)

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

### 3.3. Cập nhật API Quản lý Nhân viên (`handler/employee.go`)
- Bổ sung chức năng cập nhật danh sách quyền hạn cho nhân viên. 
- **Validation**: 
    - Giới hạn số lượng ID trong mảng `AssignedInundationPointIDs` và `AssignedEmergencyConstructionIDs` không được vượt quá 1.
    - Trước khi lưu, hệ thống phải kiểm tra xem các ID điểm ngập/công trình được chọn có đang thuộc về nhân viên khác (trong cùng org) hay không. Nếu có, trả về lỗi 400 và thông báo điểm đã được gán.

## 3. Thay đổi Frontend (React AI-Frontend)

### 3.1. Quản lý Nhân viên (Dành cho Quản trị viên/Quản lý)
- Trong trang chỉnh sửa thông tin nhân viên, sử dụng **Popup Selection Dialog**:
    - Hiển thị danh sách các điểm đã chọn kèm nút "Thay đổi".
    - Khi mở Popup:
        - **Highlight/Disable**: Các điểm ngập/công trình đã được gán cho nhân viên khác sẽ hiển thị mờ (disabled) kèm ghi chú "Đã gán cho [Tên nhân viên khác]" để tránh chọn nhầm.
        - Tìm kiếm và lọc theo trạng thái (Chưa gán / Đã gán).
- Gọi API cập nhật mới để lưu hệ thống.

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