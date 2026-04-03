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
    - `pump_count` (int): Tổng số lượng máy bơm (Bao gồm thường và khẩn cấp).
    - `active` (bool): Trạng thái hoạt động.
    - `link` (string): Link SignalR kết nối lấy dữ liệu (Ví dụ: `https://thoatnuochanoi.vn/pump/signalr`).
    - `is_auto` (bool): Trạng thái tự động lấy dữ liệu.
- **Phân quyền**: 
    - `super_admin`: Toàn quyền CRUD.
    - `employee`: Xem thông tin trạm được gán.

### B. Lịch sử vận hành (`PumpingStationHistory`)
- **Mục tiêu**: Theo dõi số lượng máy bơm đang hoạt động, đóng hoặc bảo dưỡng.
- **Các trường thông tin**:
    - `station_id` (string): ID trạm bơm.
    - `user_id` (string): ID nhân viên hoặc "SYSTEM" (nếu lấy tự động).
    - `operating_count` (int): Số lượng máy bơm đang vận hành.
    - `closed_count` (int): Số lượng máy bơm đang đóng.
    - `maintenance_count` (int): Số lượng máy bơm đang bảo dưỡng.
    - `note` (string): Ghi chú thêm (Ví dụ: "Dữ liệu tự động từ hệ thống").
    - `timestamp` (int64): Thời gian báo cáo.

## 3. Các bước thực hiện (Backend - Go API)

### Bước 1: Khởi tạo Model
- Tạo file `internal/models/pumping_station.go`:
    - Struct `PumpingStation`.
    - Struct `PumpingStationHistory`.
- Cập nhật struct `User` trong `internal/models/user.go`: Thêm `AssignedPumpingStationID`.

### Bước 2: Xây dựng Repository
- Implement các phương thức: `Create`, `Update`, `Delete`, `GetByID`, `List` cho Station & History.

### Bước 3: Xây dựng Service & Background Worker
- Tạo logic quản lý trạm bơm.
- **Background Worker**:
    - Quét các trạm có `is_auto = true`.
    - Duy trì kết nối SignalR SSE tới `link` của trạm.
    - Chạy chu kỳ **10 giây/lần**.
    - **Deduplication Logic**: So sánh kết quả vừa lấy được với bản ghi `History` mới nhất trong Database. Nếu trùng khớp cả 3 chỉ số bơm (`operating`, `closed`, `maintenance`) và `station_id` thì **BỎ QUA**, không ghi thêm dữ liệu.

## 4. Các bước thực hiện (Frontend - React)

### Bước 1: Khai báo API & UI Quản lý
- CRUD Trạm bơm và Gán nhân viên.

### Bước 2: Giao diện Báo cáo (Employee)
- Form nhập báo cáo thủ công (dành cho các trạm `is_auto = false`).
- Xem lịch sử trạm được giao.

### Bước 3: Giao diện Lịch sử (Admin)
- Xem bảng lịch sử tổng hợp (Bao gồm cả dữ liệu nhập tay và dữ liệu tự động).

## 5. Tích hợp Dữ liệu Tự động (Background Job)

### A. Phân tích gói tin SignalR (`rcvPumpStatus`)
Mỗi máy bơm được đại diện bởi **6 tham số liên tiếp** trong mảng 120 đối số. Trong đó có **5 chỉ số nhị phân (Binary)** và 1 chỉ số giá trị (Numeric):

| Thứ tự | Vai trò | Kiểu dữ liệu | Giải thích |
| :--- | :--- | :--- | :--- |
| **1** | **Pump On** | Binary (0/1) | 1 = Máy đang chạy, 0 = Máy tắt |
| **2** | **Pump Fault** | Binary (0/1) | 1 = Máy đang lỗi/bảo trì (Ưu tiên cao nhất) |
| **3** | **Current** | Numeric | Giá trị dòng điện (Amperes) |
| **4** | **Valve Open** | Binary (0/1) | 1 = Van đang mở |
| **5** | **Valve Close** | Binary (0/1) | 1 = Van đang đóng |
| **6** | **Valve Fault** | Binary (0/1) | 1 = Van đang lỗi |

### B. Thuật toán tổng hợp trạng thái
Với mỗi cụm 6 số, hệ thống sẽ phân loại máy bơm vào 1 trong 3 trạng thái:
1.  **Maintenance (Bảo dưỡng)**: Nếu **Tham số 2 (Fault) == 1**.
2.  **Operating (Vận hành)**: Nếu **Tham số 2 == 0** (Không lỗi) **VÀ** **Tham số 1 (On) == 1**.
3.  **Closed (Đang đóng)**: Nếu **Tham số 2 == 0** (Không lỗi) **VÀ** **Tham số 1 (On) == 0**.

### C. Quy trình lưu trữ & Vòng đời
1. Kết nối SignalR qua link cấu hình trong `PumpingStation`.
2. Sau mỗi 10 giây, parse 120 đối số -> Tính tổng `operating`, `closed`, `maintenance`.
3. So sánh với bản ghi `History` gần nhất. Chỉ `INSERT` nếu có sự thay đổi ở ít nhất 1 trong 3 chỉ số.
4. Tự động Start/Restart/Stop job khi dữ liệu trạm bơm trong DB thay đổi.

## 6. Danh sách công việc (Checklist)
- [x] Backend: Model `PumpingStation` & `History`.
- [x] Backend: Cập nhật Model `User` (trường assigned).
- [x] Backend: Service & Handlers (CRUD + Reporting logic).
- [x] Backend: API Routes & Role Permission.
- [x] Frontend: API client & Employee assignment UI.
- [x] Frontend: Employee reporting form (Bao gồm nút Xem lịch sử).
- [x] Frontend: Admin history management view UI.
- [x] Frontend: Tích hợp Tab Mobile "Trạm bơm" cho nhân viên.
- [ ] Backend Proxy: Implement SignalR Client (10s interval, Parsing to History).
- [ ] Backend Logic: Deduplication logic (Only insert if data changes).
- [ ] Backend Worker: Lifecycle management (Start/Restart job on Station update).