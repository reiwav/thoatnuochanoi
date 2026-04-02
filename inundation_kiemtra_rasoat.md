# Kế hoạch triển khai: Hệ thống Kiểm tra & Rà soát Báo cáo Điểm ngập (Hoàn thiện)

Sổ tay hướng dẫn này mô tả cách triển khai tính năng cho phép đội kiểm tra (Reviewer) để lại nhận xét và yêu cầu nhân viên (Employee) chỉnh sửa lại thông tin báo cáo điểm ngập trực tiếp trong phần lịch sử.

## Mục tiêu (Đã cập nhật)
- Cho phép Reviewer gửi phản hồi (comment) cho từng bản ghi trong lịch sử.
- Nhân viên có quyền sửa lại dữ liệu (ảnh, thông số) của bản ghi bị yêu cầu sửa.
- Reviewer có quyền xem danh sách và chi tiết các báo cáo điểm ngập của đơn vị để kiểm tra rà soát.
- **Vai trò mới**: `reviewer` (Kiểm tra rà soát) - được quản lý bởi `admin_org`.

## Thay đổi đã thực hiện

### 1. Backend (`ai-api-tnhn`) - [HOÀN THÀNH]

#### [MODIFY] [constant/role.go]
- Khai báo hằng số: `ROLE_REVIEWER = "reviewer"`.

#### [MODIFY] [internal/models/inundation.go]
- Thêm các trường vào `InundationUpdate`: `ReviewComment`, `ReviewerId`, `NeedsCorrection`.

#### [MODIFY] [handler/inundation.go] & [router/inundation.go]
- `POST /inundation/update/:id/review`: API gửi nhận xét (Chỉ dành cho Reviewer/Admin).
- `PUT /inundation/update/:id`: API sửa nội dung bản cập nhật (Dành cho Employee khi bị yêu cầu sửa).
- Logic `ListReports` đã hỗ trợ Reviewer xem toàn bộ báo cáo trong đơn vị (Org).

### 2. Frontend (`ai-frontend-tnhn`) - [HOÀN THÀNH]

#### [FIX] Cấp quyền Menu cho Reviewer
- **File**: `src/menu-items/admin.js`
- **Thay đổi**: Thêm `reviewer` vào danh sách `roles` của mục **Điểm ngập** (`inundation-management`). Role này chỉ truy cập dữ liệu điểm ngập để kiểm tra báo cáo.

#### [MODIFY] [src/views/admin/employee/EmployeeDialog.jsx]
- Thêm vai trò "Kiểm tra rà soát" (`reviewer`) vào dropdown chọn Role để `admin_org` có thể tạo tài khoản.

#### [MOD] View Chi tiết Điểm ngập (InundationDetail.jsx):
- **Giao diện Nhận xét**: 
  - Chuyển sang thiết kế dạng Alert với nền đỏ nhạt (`error.lighter`) và viền trái màu đỏ đậm (`error.main`).
  - Font chữ chuyển sang màu đỏ đậm (`error.dark`) để dễ đọc và tăng độ tương phản.
- **Thông tin người rà soát**: Hiển thị **Họ tên người rà soát** để nhân viên dễ nhận biết (tự động lấy từ thông tin tài khoản).
- **Đối với Reviewer**: Hiển thị nút "Nhận xét" bên cạnh **tất cả bản ghi do nhân viên gửi** (bao gồm Báo cáo khởi tạo và các bản Cập nhật tình hình tiếp theo). 
- **Đối với Employee**: 
  - **Cảnh báo nổi bật**: Hiển thị hộp thông báo màu đỏ ngay tại tab "Cập nhật" nếu có yêu cầu rà soát, giúp nhân viên không bỏ lỡ phản hồi.
  - **Lịch sử & Nhận xét**: Hiển thị nội dung nhận xét rà soát chi tiết trong tab "Chi tiết".
  - **Chỉnh sửa**: Hiện nút "Chỉnh sửa lại" để mở Form cập nhật đúng bản ghi cần sửa.

## Quy trình nghiệp vụ (Workflow)
1. **Báo cáo**: Employee gửi cập nhật tình hình ngập.
2. **Kiểm tra**: Reviewer vào menu "Điểm ngập" -> Xem chi tiết lịch sử -> Bấm "Nhận xét" -> Nhập nội dung. Hệ thống tự động ghi lại Họ tên người rà soát.
3. **Chỉnh sửa**: Employee mở báo cáo, thấy ngay thông báo yêu cầu sửa nổi bật ở đầu trang -> Bấm "Xem chi tiết & Sửa" -> Cập nhật lại thông tin chính xác.
4. **Hoàn tất**: Sau khi sửa, trạng thái `NeedsCorrection` tự động về `false`, hộp thông báo cảnh báo sẽ biến mất.

## Kế hoạch kiểm tra
1. Login bằng tài khoản `admin_org`.
2. Tạo tài khoản "Kiểm tra rà soát" mới với Họ tên đầy đủ.
3. Dùng tài khoản `reviewer` gửi nhận xét cho một báo cáo.
4. Kiểm tra trên giao diện Employee xem hộp nhận xét đã hiển thị **Họ tên người rà soát** chưa.

## Phân quyền & Menu (Reviewer) - [CẬP NHẬT]
- **Giới hạn truy cập**: Vai trò `reviewer` chỉ được thấy 2 menu con duy nhất: **"Danh sách"** (Danh mục điểm ngập) và **"Quản lý báo cáo"**.
- **Điều hướng đăng nhập**: Khi Reviewer đăng nhập thành công, hệ thống tự động điều hướng trực tiếp vào trang **Quản lý báo cáo** (`/admin/inundation-list`) thay vì Dashboard mặc định.
- **Ẩn Menu**: Tự động ẩn toàn bộ các menu khác...
