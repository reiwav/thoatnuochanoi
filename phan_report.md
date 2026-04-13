# Kế hoạch triển khai hiển thị thông tin thời gian báo cáo điểm ngập

Dựa trên yêu cầu tại file phan_report.md, chúng ta sẽ cập nhật hệ thống để hiển thị đầy đủ các mốc thời gian (Bắt đầu, Cập nhật cuối, Tổng thời gian) trên tất cả các bảng danh sách điểm ngập.

## 1. Backend: Đảm bảo tính chính xác của dữ liệu
- **updated_at:** Hiện tại hàm `R_Update` trong backend đã tự động gọi `BeforeUpdate()` để cập nhật `updated_at` (MTime) mỗi khi bản ghi được lưu. 
- **Kiểm tra:** Xác soát lại các hàm `AddUpdate situación`, `UpdateReport` và `ResolveInundation` trong `service.go` để đảm bảo lệnh `inundationRepo.Update` luôn được gọi khi có thay đổi tình hình.

## 2. Frontend: Cập nhật tiện ích hiển thị thời gian
- Sử dụng hoặc bổ sung hàm helper để tính toán khoảng thời gian (Duration): `Tổng thời gian = Thời điểm hiện tại - created_at`.
- Định dạng hiển thị: 
    - `Thời gian bắt đầu`: Định dạng `HH:mm DD/MM/YYYY` từ `created_at`.
    - `Cập nhật lúc`: Định dạng `HH:mm DD/MM/YYYY` từ `updated_at`.
    - `Tổng thời gian`: Hiển thị dạng "X giờ Y phút" hoặc "X ngày".

## 3. Frontend: Cập nhật giao diện bảng (Table Views)
Sửa đổi 2 file chính chứa danh sách dạng bảng:
- **File 1:** `src/views/employee/inundation/InundationDashboard.jsx` (Giao diện nhân viên).
- **File 2:** `src/views/admin/inundation/InundationAdminList.jsx` (Giao diện quản trị).

**Các thay đổi cụ thể:**
- Bổ sung/Cập nhật các cột trong bảng:
    1. **Bắt đầu ngập:** Hiển thị giá trị `created_at`.
    2. **Cập nhật mới nhất:** Hiển thị giá trị `updated_at`.
    3. **Thời gian đã ngập:** Hiển thị giá trị tính toán (Duration).

## 4. Thứ tự thực hiện
1. **Bước 1:** Kiểm tra logic Backend để chắc chắn `updated_at` luôn thay đổi khi có cập nhật diễn biến mới.
2. **Bước 2:** Cập nhật bảng tại giao diện Nhân viên (`InundationDashboard.jsx`).
3. **Bước 3:** Cập nhật bảng tại giao diện Admin (`InundationAdminList.jsx`).
4. **Bước 4:** Kiểm tra tính nhất quán dữ liệu giữa 2 giao diện.