# Kế hoạch triển khai: Hệ thống Kiểm tra & Rà soát Báo cáo Điểm ngập (Cập nhật)

Sổ tay hướng dẫn này mô tả cách triển khai tính năng cho phép đội kiểm tra (Reviewer) để lại nhận xét và yêu cầu nhân viên (Employee) chỉnh sửa lại thông tin báo cáo điểm ngập trực tiếp trong phần lịch sử.

## Mục tiêu
- Cho phép Reviewer gửi phản hồi (comment) cho từng bản ghi trong lịch sử.
- Nhân viên có quyền sửa lại dữ liệu (ảnh, thông số) của bản ghi bị yêu cầu sửa.
- Không tạo bảng mới, tận dụng cấu trúc "Updates" hiện có.
- **Thêm vai trò mới**: `reviewer` (Kiểm tra rà soát) - được quản lý bởi `admin_org`

## Thay đổi đề xuất

### 1. Backend (`ai-api-tnhn`)

#### [MODIFY] [constant/role.go](file:///Volumes/Mylife/Dev/My%20Outsource/Reiway/thoatnuochanoi/ai_tnhn/ai-api-tnhn/constant/role.go)
- Khai báo hằng số mới: `ROLE_REVIEWER = "reviewer"`.

#### [MODIFY] [internal/models/inundation.go](file:///Volumes/Mylife/Dev/My%20Outsource/Reiway/thoatnuochanoi/ai_tnhn/ai-api-tnhn/internal/models/inundation.go)
- Thêm các trường vào `InundationUpdate`:
  - `ReviewComment`: Nội dung phản hồi từ đội kiểm tra.
  - `ReviewerId`: ID người kiểm tra.
  - `NeedsCorrection`: Boolean (true nếu cần sửa). default: false (true sẽ phải sửa nhé)

#### [NEW] API Endpoints trong `InundationHandler`:
- `POST /inundation/update/:id/review`: Gửi nhận xét cho một bản cập nhật lịch sử (Quyền: `reviewer`).
- `PUT /inundation/update/:id`: Cập nhật bản cập nhật (chỉ khi có yêu cầu sửa - Quyền: `employee`).

### 2. Frontend (`ai-frontend-tnhn`)

#### [MODIFY] [src/views/admin/employee/EmployeeDialog.jsx](file:///Volumes/Mylife/Dev/My%20Outsource/Reiway/thoatnuochanoi/ai_tnhn/ai-frontend-tnhn/src/views/admin/employee/EmployeeDialog.jsx)
- Thêm vai trò "Kiểm tra rà soát" (`reviewer`) vào dropdown chọn Role.
- Cho phép cả `super_admin` và `admin_org` lựa chọn vai trò này khi tạo tài khoản.

#### [MODIFY] View Chi tiết Điểm ngập (Inundation History):
- **Đối với Admin/Reviewer**: Hiển thị nút "Yêu cầu sửa" (Icon Comment) bên cạnh mỗi dòng lịch sử. Khi bấm sẽ hiện Dialog nhập nhận xét.
- **Đối với Employee**: 
  - Nếu bản ghi có `ReviewComment`, hiển thị dải màu cảnh báo và nội dung nhận xét.
  - Hiện nút "Chỉnh sửa" (Icon Edit) dẫn đến Form cập nhật lại thông tin.

## Quy trình nghiệp vụ (Workflow)
1. **Gửi**: Employee gửi báo cáo (Status: `submitted`).
2. **Review**: Một tài khoản có role `reviewer` (do `admin_org` tạo) xem lịch sử -> Thấy sai -> Bấm "Yêu cầu sửa" -> Gửi nhận xét.
3. **Sửa**: Employee thấy dòng đó có màu cảnh báo + nội dung sếp phê -> Bấm "Sửa" -> Cập nhật lại thông tin.

## Kế hoạch xác minh
- **Manual Test**: 
  - Dùng account `admin_org` tạo một account `reviewer`.
  - Dùng account `reviewer` gửi comment yêu cầu sửa.
  - Dùng account `employee` thực hiện sửa và kiểm tra tính đúng đắn của dữ liệu.
