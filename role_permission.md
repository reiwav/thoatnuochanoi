# Tài liệu Hệ thống: Phân quyền Chi tiết (Granular RBAC)

Tài liệu này định nghĩa cấu trúc và cách vận hành của hệ thống phân quyền hành động (Action-based RBAC) đã được triển khai.

## 1. Nguyên tắc Phân quyền
- **Mã quyền (Permission Code)**: Định dạng `module:action` (ví dụ: `inundation:create`).
- **Phân loại hành động**:
    - `view`: Quyền xem danh sách, chi tiết và hiển thị mục menu.
    - `create`: Quyền thêm mới bản ghi.
    - `edit`: Quyền chỉnh sửa thông tin.
    - `delete`: Quyền xóa bản ghi.
    - `control`: Quyền điều khiển thiết bị (Cửa phai, Trạm bơm).

## 2. Danh mục Quyền chi tiết (Đã triển khai)

Hệ thống hiện tại hỗ trợ hơn 60 mã quyền chi tiết. Dưới đây là các đầu mục chính:

| Nhóm / Module | Xem (view) | Thêm (create) | Sửa (edit) | Xóa (delete) | Khác |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **VẬN HÀNH** | | | | | |
| Lượng mưa | `rain:view` | `rain:create` | - | - | `rain:export` |
| Điểm ngập | `inundation:view`| `inundation:create`| `inundation:edit` | `inundation:delete` | `sa-hinh-ngap:view` |
| Mực nước | `water:view` | `water:create` | `water:edit` | - | |
| Trạm đo (Setup) | `station:view` | `station:create` | `station:edit` | `station:delete` | |
| Cửa phai | `cuapai:view` | - | - | - | `cuapai:control` |
| Trạm bơm | `trambom:view` | - | `trambom:edit` | `trambom:delete` | `trambom:control` |
| BC CT Khẩn cấp | `emergency:view` | `emergency:create`| `emergency:edit` | `emergency:delete` | |
| **QUẢN TRỊ** | | | | | |
| Nhân sự | `employee:view` | `employee:create` | `employee:edit` | `employee:delete` | |
| Đơn vị (Org) | `organization:view`| `organization:create`| `organization:edit` | `organization:delete` | |
| Hợp đồng | `contract:view` | `contract:create` | `contract:edit` | `contract:delete` | |
| Phân quyền | `role:view` | - | `role:edit` | - | |
| **AI** | `ai:chat` | - | - | - | `ai:report`, `ai:synthesis` |

## 3. Cách thức Vận hành

### 3.1. Đồng bộ Cơ sở dữ liệu (Seeding)
Mọi thay đổi về danh mục quyền hoặc gán quyền mặc định cho Role (Admin, PGĐ, Công nhân...) đều được định nghĩa trong file seeder.
- **Lệnh thực thi**:
  ```bash
  cd ai_tnhn/ai-api-tnhn
  go run cmd/seed/main.go
  ```

### 3.2. Hiển thị trên Frontend
Sử dụng hook `hasPermission` từ `useAuthStore` để kiểm tra quyền trước khi render UI.

```javascript
import useAuthStore from 'store/useAuthStore';

const { hasPermission } = useAuthStore();

// 1. Kiểm tra quyền hành động
{hasPermission('contract:delete') && (
    <IconButton onClick={handleDelete}><IconTrash /></IconButton>
)}

// 2. Sidebar Menu (Tự động)
// Các mục menu trong src/menu-items/admin.js có ID trùng với mã quyền :view 
// sẽ tự động ẩn/hiện dựa trên quyền của người dùng.
```

### 3.3. Bảo mật Sidebar
Logic trong `NavGroup` và `NavCollapse` đã được cập nhật để **ẩn toàn bộ nhóm menu** nến người dùng không có quyền xem bất kỳ mục nào bên trong nhóm đó.

## 4. Quản lý Ma trận Quyền (Role Matrix)
Quản trị viên có thể thay đổi quyền chi tiết của từng Role (ví dụ: cho phép Công nhân sửa điểm ngập nhưng không được xóa) trực tiếp trên giao diện Dashboard tại mục **Hệ thống > Ma trận quyền**.
