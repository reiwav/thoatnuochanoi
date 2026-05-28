# Kế hoạch chi tiết: Hệ thống Phân quyền (Access Control)

Hệ thống sẽ được nâng cấp từ kiểm tra `Role` cơ bản sang hệ thống **RBAC (Role-Based Access Control)** kết hợp với **Data Scoping (Organization-level)**.

## 1. Định nghĩa Quyền (Permissions)
Chúng ta sẽ định nghĩa danh sách các "hành động" (Actions) cụ thể trong `internal/constant/permission.go`.

| Module | Read | Create | Update | Delete | Special |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rain (Lượng mưa)** | `rain:read` | `rain:create` | `rain:update` | `rain:delete` | - |
| **Water (Mực nước)** | `water:read` | `water:create` | `water:update` | `water:delete` | - |
| **Inundation (Ngập)** | `inu:read` | `inu:create` | `inu:update` | `inu:delete` | `inu:approve` |
| **Construction (CTKC)** | `cons:read` | `cons:create` | `cons:update` | `cons:delete` | `cons:approve` |
| **Pump (Trạm bơm)** | `pump:read` | `pump:create` | `pump:update` | `pump:delete` | - |
| **User (Tài khoản)** | `user:read` | `user:create` | `user:update` | `user:delete` | `user:assign` |
| **Contract (Hợp đồng)** | `contract:read` | `contract:create` | `contract:update` | `contract:delete` | - |

## 2. Ma trận Phân quyền (Role-Permission Matrix)

| Role | Quyền hạn chính | Phạm vi dữ liệu (Scope) |
| :--- | :--- | :--- |
| **Super Admin** | Toàn quyền (`sys:full`) | Toàn bộ hệ thống |
| **Admin Org** | `user:*`, `inu:*`, `cons:*` | Trong đơn vị (OrgID) |
| **Manager Contract** | `contract:*` | Theo Org/Toàn bộ? |
| **Reviewer** | `inu:read`, `inu:approve`, `cons:approve` | Trong đơn vị hoặc được gán |
| **Employee** | `inu:create/update`, `cons:create/update` | Chỉ các điểm được gán (Assigned IDs) |

## 3. Thay đổi Backend

### Phân tầng Middleware
1.  **Authentication**: Kiểm tra Token (Đã có).
2.  **Role Enforcement**: `MidBasicType(role)` (Đã có, dùng cho các case đơn giản).
3.  **Permission Enforcement (Mới)**: `MidHasPermission(permission)` kiểm tra xem role của user có permission đó không.
4.  **Org Scope Enforcement**: Đảm bảo user chỉ thấy/sửa data của Org mình (Dùng `OrgID` trong Query).

#### File đề xuất chỉnh sửa:
-   `internal/constant/permission.go` [NEW]
-   `internal/service/auth/permission_service.go` [NEW]: Chứa logic map Role -> Permissions.
-   `router/middleware/mid.go`: Thêm `MidPermission`.

## 4. Thay đổi Frontend

### Phân quyền Menu
-   Cập nhật `item.roles` trong `src/menu-items/admin.js` để match chính xác các role mới.
-   (Option) Dùng danh sách `permissions` từ backend trả về khi login để render menu động.

### Phân quyền chức năng (Buttons/Actions)
-   Tạo Component `<PermissionGuard permission="user:create">` để bao bọc các Button như "Thêm mới", "Xóa".

## 5. Các bước thực hiện (Roadmap)

1.  **Giai đoạn 1**: Thống nhất danh sách Permissions và mapping Role.
2.  **Giai đoạn 2**: Cập nhật Backend Middleware và bảo vệ các routes quan trọng (User management, Organization).
3.  **Giai đoạn 3**: Thực thi Scoping (OrgID check) trong Repository layer.
4.  **Giai đoạn 4**: Đồng bộ Frontend menu và giấu/hiện các nút chức năng.

---
> [!IMPORTANT]
> Câu hỏi cho người dùng:
> 1. Role `manager_contract` có cần xem các module khác (Rain, Water) không?
> 2. `Reviewer` thuộc Org nào thấy Org đó, hay là Reviewer tổng cho toàn bộ công ty?
> 3. `Employee` có được phép xem lịch sử của những người khác trong cùng Org không, hay chỉ của mình?