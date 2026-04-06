# Kế hoạch chi tiết: Nâng cấp hệ thống Lịch sử Ngập và Xử lý Hiệu đính (Đã đơn giản hóa)

Dựa trên phản hồi từ bạn, chúng ta sẽ tối giản việc lưu trữ lịch sử sửa đổi (Audit Log) bằng cách thêm một trường mảng trực tiếp vào bản ghi.

## 1. Thay đổi cấu trúc dữ liệu (Backend Model)

**File:** `internal/models/inundation.go`

*   **Trường mới trong `InundationUpdate`:**
    *   `OldData []interface{}` (hoặc `[]map[string]interface{}`): Trường này sẽ lưu trữ mảng các đối tượng JSON chứa dữ liệu cũ trước mỗi lần sửa.
    *   Mỗi phần tử trong mảng sẽ chụp lại trạng thái của các trường: `depth`, `length`, `width`, `description`, `traffic_status`, `images`, `timestamp`.

## 2. Cập nhật Logic xử lý (Backend Service)

**File:** `internal/service/inundation/service.go`

### Hàm `UpdateUpdateContent`:
*   **Bước 1:** Trước khi cập nhật dữ liệu mới từ nhân viên, lấy dữ liệu hiện tại của bản ghi `InundationUpdate`.
*   **Bước 2:** Đóng gói dữ liệu hiện tại thành một object (JSON).
*   **Bước 3:** `Append` object đó vào trường `OldData`.
*   **Bước 4:** Ghi đè dữ liệu mới và đặt `NeedsCorrection = false`.

### Hàm `ReviewReport` & `ReviewUpdate`:
*   **Ràng buộc:** Chỉ cho phép Reviewer gửi nhận xét nếu trạng thái báo cáo đang là **"Đang ngập" (active)**. Nếu đã kết thúc, hệ thống sẽ chặn và không hiển thị nút nhận xét.

## 3. Cập nhật Giao diện (Frontend)

**File:** `InundationDashboard.jsx` & `InundationAdminList.jsx`

*   **Hiển thị Lịch sử:**
    *   Trong phần chi tiết của từng cập nhật ngập, nếu có dữ liệu trong `OldData`, hiển thị nội dung cũ để Reviewer đối chiếu.
    *   **Mới:** Hiển thị nội dung nhận xét của Reviewer (`review_comment`) ngay trong danh sách dropdown lịch sử cập nhật để dễ theo dõi luồng sửa đổi.
*   **Trạng thái:** Vẫn giữ nguyên logic hiển thị `ReviewComment` để nhân viên biết cần sửa gì, và sau khi nhân viên sửa, hệ thống sẽ tự lưu bản cũ để Reviewer kiểm tra lại.

---
*Ghi chú: Việc sử dụng mảng JSON trực tiếp giúp cấu trúc code đơn giản hơn và vẫn đảm bảo việc truy vết dữ liệu cũ.*