# Bảng Ma trận Chức năng (Function-based Permission Matrix)

Tài liệu này định nghĩa các chức năng (Menu/Quyền) và các Role được phép truy cập ("tích chọn"). 
Cấu trúc này giúp dễ dàng nâng cấp hệ thống khi muốn thêm chức năng hoặc Role mới.

| Chức năng / Module | SA | AO | MC | RE | EM | Ghi chú |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **HTBC mùa mưa (AI)** | ✅ | ❌ | ❌ | ❌ | ❌ | Hệ thống trợ lý AI |
| **Lượng mưa** | ✅ | ✅ | ❌ | ✅ | ✅ | Phân theo Xí nghiệp (OrgID) |
| **Điểm ngập** | ✅ | ✅ | ❌ | ✅ | ❌ | Báo cáo & Giám sát |
| **Mực nước** | ✅ | ❌ | ❌ | ❌ | ✅ | Sông hồ & Cống |
| **Cửa phai** | ✅ | ❌ | ❌ | ❌ | ✅ | Điều hành trạm |
| **Trạm bơm** | ✅ | ✅ | ❌ | ✅ | ✅ | Giám sát vận hành |
| **Phân quyền** | ✅ | ✅ | ❌ | ❌ | ❌ | Quản lý User/Org |
| **Hợp đồng** | ✅ | ❌ | ✅ | ❌ | ❌ | Quản lý AI Contract |
| **Tin nhắn báo cáo** | ✅ | ❌ | ❌ | ❌ | ❌ | Gửi thông báo tự động |
| **Báo cáo tổng hợp** | ✅ | ❌ | ❌ | ❌ | ❌ | Xuất file báo cáo |

---

### Chú thích Role:
- **SA**: Super Admin (Kỹ thuật hệ thống)
- **AO**: Admin Org (Giám đốc/Quản lý Xí nghiệp)
- **MC**: Manager Contract (Quản lý Hợp đồng)
- **RE**: Reviewer (Trưởng phòng kỹ thuật/Kiểm duyệt)
- **EM**: Employee (Công nhân hiện trường)

✅: Role đã được "tích" (Có quyền)
❌: Role chưa có quyền

---

## Phương hướng xử lý (Handling Plan - Nâng cấp)

Để hệ thống có thể nâng cấp và mở rộng linh hoạt "bằng cách tích từng Role cho chức năng", ta sẽ thực hiện các bước sau:

### 1. Đồng bộ Menu với Role (Frontend)
Trong `src/menu-items/admin.js`, chúng ta sẽ ánh xạ trực tiếp các Role từ bảng trên vào thuộc tính `roles` của từng menu item.
*Ví dụ:*
```javascript
{
  id: 'inundation-management',
  roles: ['super_admin', 'admin_org', 'reviewer'] // Các role đã được "tích"
}
```

### 2. Kiểm soát Chức năng bằng `PermissionGuard`
Tạo một component chung để bao bọc các module hoặc nút bấm:
```jsx
<PermissionGuard roles={['super_admin', 'employee']}>
  <SluiceGateControl />
</PermissionGuard>
```

### 3. (Upgrade) Dynamic Authorization Service
Trong tương lai, thay vì hardcode mảng `roles` trong JS, chúng ta có thể:
1. Tạo một API trả về cấu hình: `GET /api/v1/permissions/matrix`.
2. Frontend lưu cấu hình này vào Redux.
3. Menu sẽ được render động theo dữ liệu từ API này, cho phép Admin "tích chọn" Role ngay trên giao diện mà không cần chỉnh sửa code.
