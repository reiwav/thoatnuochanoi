# Kế hoạch Triển khai: Quản lý Trạm bơm (Phân quyền & Lịch sử vận hành)

## 1. Mục tiêu
Xây dựng tính năng quản lý danh sách trạm bơm và theo dõi lịch sử vận hành của máy bơm. 
- `super_admin`: Quản lý danh sách trạm bơm và xem lịch sử.
- `employee`: Cập nhật tình trạng vận hành máy bơm tại trạm được giao.

## 2. Thông tin nghiệp vụ
### A. Trạm bơm (`PumpingStation`)
- **Các trường thông tin**:
    - `name` (string): Tên trạm bơm.
    - `address` (string): Địa chỉ.
    - `pump_count` (int): Tổng số lượng máy bơm.
    - `active` (bool): Trạng thái hoạt động.
    - `link` (string): Link đến trang web/hệ thống quản lý của trạm (Yên Sở là Auto, còn lại manual).
    - `is_auto` (bool): Trạng thái tự động.
- **Phân quyền**: 
    - `super_admin`: Toàn quyền CRUD.
    - `employee`: Xem thông tin trạm được gán.

### B. Lịch sử vận hành (`PumpingStationHistory`)
- **Mục tiêu**: Theo dõi số lượng máy bơm đang hoạt động, đóng hoặc bảo dưỡng.
- **Các trường thông tin**:
    - `station_id` (string): ID trạm bơm.
    - `user_id` (string): ID nhân viên thực hiện báo cáo.
    - `operating_count` (int): Số lượng máy bơm đang vận hành.
    - `closed_count` (int): Số lượng máy bơm đang đóng.
    - `maintenance_count` (int): Số lượng máy bơm đang bảo dưỡng.
    - `note` (string): Ghi chú thêm.
    - `timestamp` (int64): Thời gian báo cáo.
- **Ràng buộc**: 
    - Mỗi nhân viên (`employee`) chỉ được gán cho **DUY NHẤT 1** trạm bơm.
    - Nhân viên chỉ có quyền cập nhật lịch sử cho trạm bơm mà mình được giao.

## 3. Các bước thực hiện (Backend - Go API)

### Bước 1: Khởi tạo Model
- Tạo file `internal/models/pumping_station.go`:
    - Struct `PumpingStation`.
    - Struct `PumpingStationHistory`.
- Cập nhật struct `User` trong `internal/models/user.go`:
    - Thêm `AssignedPumpingStationID string` (BSON/JSON: `assigned_pumping_station_id`).

### Bước 2: Xây dựng Repository
- Tạo `internal/repository/pumping_station.go`:
    - Interface cho cả `PumpingStation` và `PumpingStationHistory`.
- Implement các phương thức: `Create`, `Update`, `Delete`, `GetByID`, `List` cho Station.
- Implement các phương thức: `CreateHistory`, `ListHistory` cho History.

### Bước 3: Xây dựng Service
- Tạo `internal/service/pumping_station/service.go`:
    - Logic nghiệp vụ cho Station và History.
    - **Validation**: Đảm bảo tổng `operating_count + closed_count + maintenance_count` hợp lệ so với `pump_count` của trạm (Optional - tùy yêu cầu kiểm soát).
    - Logic gán nhân viên vào trạm: Cập nhật `AssignedPumpingStationID` của User.

### Bước 4: Xây dựng Handler
- Tạo `handler/pumping_station.go`:
    - `CreateReport`: Endpoint cho nhân viên gửi báo cáo tình trạng trạm.
    - `ListHistory`: Xem lịch sử báo cáo của một trạm (dành cho Admin).
    - Quản lý metadata trạm (CRUD).

### Bước 5: Đăng ký Router
- Cập nhật file `router/station.go`:
    - Thêm group `/pumping` trong `/stations`.
    - Đăng ký các route:
        - `GET /stations/pumping`: List trạm bơm.
        - `POST /stations/pumping/report`: Gửi báo cáo lịch sử máy bơm (Role: Employee).
        - `GET /stations/pumping/:id/history`: Xem lịch sử máy bơm của trạm (Role: Admin/Super Admin).

## 4. Các bước thực hiện (Frontend - React)

### Bước 1: Khai báo API
- Cập nhật `src/api/pumpingStation.js`:
    - Các hàm gọi API CRUD trạm bơm.
    - Các hàm gọi API báo cáo lịch sử và xem lịch sử.

### Bước 2: Quản lý Nhân viên (Admin UI)
- Cập nhật `EmployeeDialog.jsx`: 
    - Thêm dropdown chọn Trạm bơm được giao (giới hạn chọn 1).

### Bước 3: Giao diện Báo cáo (Employee UI)
- Tạo component `PumpingStationReport.jsx`: 
    - Form nhập 3 chỉ số: Vận hành, Đóng, Bảo dưỡng.
    - Hiển thị thông tin trạm bơm hiện tại của nhân viên.

### Bước 4: Giao diện Quản lý & Lịch sử (Admin UI)
- Tạo component `PumpingStationList.jsx`: Quản lý danh sách trạm.
- Tạo component `PumpingStationHistory.jsx`: Hiển thị bảng/biểu đồ lịch sử vận hành các máy bơm.

### Bước 5: Cập nhật Routing & Menu
- Cập nhật `src/routes/MainRoutes.jsx`: Map các path mới.
- Cập nhật `src/menu-items/admin.js`: Thêm phân quyền cho các mục menu liên quan.
- **Tích hợp Mobile Dashboard (Employee)**: Thêm Tab "Trạm bơm" vào giao diện `/company/inundation` dành cho nhân viên trong `MainLayout.jsx`.

## 5. Danh sách công việc (Checklist)
- [ ] Backend: Model `PumpingStation` & `History`.
- [ ] Backend: Cập nhật Model `User` (trường assigned).
- [ ] Backend: Service & Handlers (CRUD + Reorting logic).
- [ ] Backend: API Routes & Role Permission.
- [ ] Frontend: API client & Employee assignment UI.
- [ ] Frontend: Employee reporting form.
- [ ] Frontend: Admin history management view UI.