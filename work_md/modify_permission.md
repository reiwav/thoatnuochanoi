# Kế hoạch chi tiết: Phân quyền hiển thị Tab cho Nhân viên (Cập nhật)

Chúng ta sẽ thực hiện ẩn/hiện các Tab điều hướng mobile dựa trên các điểm được gán cho nhân viên.

## 1. Xác định điều kiện hiển thị (Chỉ áp dụng cho Nhân viên/Kỹ thuật)
Logic lọc danh sách Tab (`availableTabs`):
- **Điểm ngập**: Hiển thị nếu `assigned_inundation_point_ids` không rỗng.
- **Trạm bơm**: Hiển thị nếu `assigned_pumping_station_id` không rỗng.
- **Công trình khẩn**: Hiển thị nếu `assigned_emergency_construction_ids` không rỗng.

*Lưu ý: Các Role khác (Super Admin, Admin Org) sử dụng giao diện Sidebar truyền thống, không bị ảnh hưởng bởi logic này.*

## 2. Xử lý trường hợp không có Tab nào (Redirect)
Nếu nhân viên không được gán bất cứ điểm nào (`availableTabs.length === 0`):
- Hệ thống sẽ tự động chuyển hướng về trang **Thông tin cá nhân** (Tab "Tài khoản" trong Dashboard - `activeTab=4`).
- Điều này giúp nhân viên vẫn có thể xem thông tin cá nhân hoặc đăng xuất mà không gặp màn hình trống.

## 3. Thay đổi kỹ thuật trong [MainLayout/index.jsx](file:///Volumes/Mylife/Dev/My%20Outsource/Reiway/thoatnuochanoi/ai_tnhn/ai-frontend-tnhn/src/layout/MainLayout/index.jsx)

### A. Khai báo mảng Tabs động
Dùng `useMemo` để tính toán danh sách tab khả dụng dựa trên `userInfo` và `pathname`.

### B. Cập nhật `value` và `onChange` của `<Tabs />`
- `value`: Sẽ là index của tab hiện tại trong mảng `availableTabs`.
- `onChange`: Sẽ lấy `availableTabs[newValue].path` để `navigate`.

### C. Logic Chuyển hướng
Thêm một `useEffect` để kiểm tra: nếu là nhân viên và mảng tab trống, thực hiện `navigate` về trang thông tin mặc định.

## 4. Các bước thực hiện
1. Sửa `MainLayout/index.jsx`: Thêm logic lọc `availableTabs`.
2. Sửa `MainLayout/index.jsx`: Cập nhật component `Tabs` và hàm `handleTopTabChange`.
3. Sửa `MainLayout/index.jsx`: Thêm logic tự động chuyển hướng nếu không có assignment.

---
Bạn có đồng ý với kế hoạch chi tiết này không? Nếu có, tôi sẽ bắt đầu thực hiện code.