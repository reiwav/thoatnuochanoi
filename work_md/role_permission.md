# Tài liệu Hệ thống: Phân quyền Chi tiết (Granular RBAC)

Tài liệu này định nghĩa cấu trúc và cách vận hành của hệ thống phân quyền hành động (Action-based RBAC).

## 1. Nguyên tắc Phân quyền

- **Cấu trúc 3 tầng**: `Menu (Group) → Màn hình (Module) → Tính năng (Action)`
- **Mã quyền (Permission Code)**: Định dạng `module:action` (ví dụ: `inundation:create`).
- **Group = Menu sidebar**: Mỗi nhóm quyền map 1:1 với menu trên sidebar.
- **Phân loại hành động**:
    - `view`: Quyền xem danh sách, chi tiết và hiển thị mục menu.
    - `create`: Quyền thêm mới bản ghi.
    - `edit`: Quyền chỉnh sửa thông tin.
    - `delete`: Quyền xóa bản ghi.
    - `control`: Quyền điều khiển thiết bị (Cửa phai, Trạm bơm).
    - `export`: Quyền xuất dữ liệu.

## 2. Danh mục Quyền chi tiết

### HTBC mùa mưa
| Code | Loại UI | Tính năng | Mô tả |
| :--- | :--- | :--- | :--- |
| `ai:chat` | `[MENU/BUTTON]` | Xem & Chat | Menu tính năng & Nhập liệu Chat tự do |
| `ai:report` | `[BUTTON]` | Tin nhắn báo cáo | Tạo tin nhắn báo cáo nhanh |
| `ai:synthesis` | `[BUTTON]` | Tổng hợp AI | Nút báo cáo tổng hợp |
| `ai:post-rain` | `[BUTTON]` | Sau mưa AI | Báo cáo sau mưa (Words) |
| `ai:report-emergency` | `[BUTTON]` | BC CT KC | Nút tạo báo cáo công trình khẩn cấp |

### Lượng mưa
| Code | Loại UI | Tính năng | Mô tả |
| :--- | :--- | :--- | :--- |
| `rain:view` | `[CHILD MENU]` | Xem | Bảng mưa, phần xem của danh sách, so sánh, lịch sử |
| `rain:create` | `[BUTTON]` | Nhập liệu | Nút thêm mới lượng mưa |
| `rain:edit` | `[BUTTON]` | Sửa | Nút chỉnh sửa lượng mưa |
| `rain:delete` | `[BUTTON]` | Xóa | Nút xóa lượng mưa |
| `rain:export` | `[BUTTON]` | Xuất dữ liệu | Nút xuất Excel trong danh sách và báo cáo |

### Điểm ngập
| Code | Loại UI | Tính năng | Mô tả |
| :--- | :--- | :--- | :--- |
| `inundation:view` | `[CHILD MENU]` | Xem | Quyền xem danh sách, bản đồ, lịch sử và dashboard điểm ngập |
| `inundation:create` | `[BUTTON]` | Báo cáo | Nút báo cáo ngập tại Dashboard |
| `inundation:edit` | `[BUTTON]` | Sửa | Chỉnh sửa trạng thái ngập |
| `inundation:delete` | `[BUTTON]` | Xóa | Xóa báo cáo ngập |

### Mực nước
| Code | Loại UI | Tính năng | Mô tả |
| :--- | :--- | :--- | :--- |
| `water:view` | `[CHILD MENU]` | Xem | Xem bảng sông hồ, lịch sử, danh sách |
| `water:create` | `[BUTTON]` | Nhập liệu | Nút thêm mới dữ liệu mực nước |
| `water:edit` | `[BUTTON]` | Sửa | Nút chỉnh sửa dữ liệu mực nước |
| `water:delete` | `[BUTTON]` | Xóa | Nút xóa dữ liệu mực nước |
| `water:export` | `[BUTTON]` | Xuất dữ liệu | Nút xuất dữ liệu ra Excel |

### BC CT Khẩn cấp
| Code | Loại UI | Tính năng | Mô tả |
| :--- | :--- | :--- | :--- |
| `emergency:view` | `[CHILD MENU]` | Xem | Xem danh sách, báo cáo, lịch sử |
| `emergency:create` | `[BUTTON]` | Tạo mới | Nút tạo công trình khẩn cấp mới |
| `emergency:edit` | `[BUTTON]` | Sửa | Nút cập nhật thông tin |
| `emergency:delete` | `[BUTTON]` | Xóa | Nút xóa công trình |
| `emergency:export` | `[BUTTON]` | Xuất báo cáo| Nút xuất danh sách báo cáo |

### Cửa phai
| Code | Loại UI | Tính năng | Mô tả |
| :--- | :--- | :--- | :--- |
| `cuapai:view` | `[MENU]` | Xem | Màn hình cửa phai |
| `cuapai:control` | `[BUTTON]` | Điều khiển | Chức năng đóng/mở cửa phai |

### Trạm bơm
| Code | Loại UI | Tính năng | Mô tả |
| :--- | :--- | :--- | :--- |
| `trambom:view` | `[MENU]` | Xem | Màn hình trạm bơm |
| `trambom:create` | `[BUTTON]` | Thêm | Thêm trạm bơm mới |
| `trambom:edit` | `[BUTTON]` | Quản lý | Sửa thông tin trạm bơm |
| `trambom:delete` | `[BUTTON]` | Xóa | Xóa trạm bơm |
| `trambom:control` | `[BUTTON]` | Điều khiển | Bật/tắt trạng thái trạm bơm |

### Sa hình ngập
| Code | Loại UI | Tính năng | Mô tả |
| :--- | :--- | :--- | :--- |
| `sa-hinh-ngap:view` | `[MENU]` | Xem | Xem bản đồ sa hình ngập |

### Hệ thống

Group này có **nhiều màn hình con**, mỗi màn hình có actions riêng:

**Tài khoản:**
| Code | Loại UI | Tính năng |
| :--- | :--- | :--- |
| `employee:view` | `[CHILD MENU]` | Xem |
| `employee:create` | `[BUTTON]` | Thêm |
| `employee:edit` | `[BUTTON]` | Sửa |
| `employee:delete` | `[BUTTON]` | Xóa |

**Chi nhánh:**
| Code | Loại UI | Tính năng |
| :--- | :--- | :--- |
| `organization:view` | `[CHILD MENU]`| Xem |
| `organization:create`| `[BUTTON]` | Thêm |
| `organization:edit` | `[BUTTON]` | Sửa |
| `organization:delete`| `[BUTTON]` | Xóa |

**Quyền hạn & Role:**
| Code | Loại UI | Tính năng |
| :--- | :--- | :--- |
| `role:view` | `[CHILD MENU]`| Xem ma trận quyền, Xem danh sách |
| `role:edit` | `[BUTTON]` | Lưu cấu hình quyền, Sửa vai trò |

### Hợp đồng
| Code | Loại UI | Tính năng | Mô tả |
| :--- | :--- | :--- | :--- |
| `contract:view` | `[CHILD MENU]` | Xem | Danh sách hợp đồng |
| `contract:create` | `[BUTTON]` | Thêm | Tạo hợp đồng mới |
| `contract:edit` | `[BUTTON]` | Sửa | Chỉnh sửa hợp đồng, Danh mục |
| `contract:delete` | `[BUTTON]` | Xóa | Xóa hợp đồng |

## 3. Ma trận Vai trò – Quyền mặc định

| Vai trò | Code | Phạm vi quyền |
| :--- | :--- | :--- |
| Super Admin | `super_admin` | Toàn quyền (tất cả permissions) |
| Chủ tịch công ty | `chu_tich_cty` | Toàn quyền |
| Giám đốc công ty | `giam_doc_cty` | Toàn quyền |
| Phó giám đốc công ty | `pho_giam_doc_cty` | Toàn quyền |
| Phòng HT – MT – CĐS | `phong_ht_mt_cds` | Toàn quyền |
| Phòng Kỹ thuật CL | `phong_kt_cl` | Xem/Nhập tất cả VH + AI báo cáo + Xem quản trị cơ bản |
| Giám đốc xí nghiệp | `giam_doc_xn` | Xem/Nhập mưa, ngập + Xem trạm bơm + CT khẩn cấp + Xem NV |
| Trưởng phòng kỹ thuật | `truong_phong_kt` | Giống Giám đốc xí nghiệp |
| Công nhân công ty | `cong_nhan_cty` | Xem mưa/ngập/nước/cửa phai/trạm bơm + Báo cáo ngập + CT khẩn cấp |

## 4. Cách thức Vận hành

### 4.1. Đồng bộ Cơ sở dữ liệu (Seeding)
Mọi thay đổi về danh mục quyền hoặc gán quyền mặc định cho Role đều được định nghĩa trong file seeder.
- **File**: `ai_tnhn/ai-api-tnhn/cmd/seed/main.go`
- **Lệnh thực thi**:
  ```bash
  cd ai_tnhn/ai-api-tnhn
  go run cmd/seed/main.go
  ```
> **Lưu ý**: Seed sẽ **drop collection `permissions`** trước khi tạo lại để đảm bảo dữ liệu sạch.

### 4.2. Hiển thị trên Frontend
Sử dụng hook `hasPermission` từ `useAuthStore` để kiểm tra quyền trước khi render UI.

```javascript
import useAuthStore from 'store/useAuthStore';

const { hasPermission } = useAuthStore();

// 1. Kiểm tra quyền hành động (ẩn/hiện button)
{hasPermission('contract:delete') && (
    <IconButton onClick={handleDelete}><IconTrash /></IconButton>
)}

// 2. Sidebar Menu (Tự động)
// Các mục menu trong src/menu-items/admin.js có ID trùng với mã quyền
// sẽ tự động ẩn/hiện dựa trên quyền của người dùng.
```

### 4.3. Bảo mật Sidebar
Logic trong `NavGroup`, `NavCollapse`, và `NavItem` đã được cập nhật để **ẩn toàn bộ nhóm menu** nếu người dùng không có quyền xem bất kỳ mục nào bên trong nhóm đó.

## 5. Quản lý Ma trận Quyền (Role Matrix UI)

Quản trị viên có thể thay đổi quyền chi tiết của từng Role trực tiếp trên giao diện tại **Hệ thống > Ma trận quyền** (`/admin/role-matrix`).

### Giao diện:
- **Cột trái**: Danh sách vai trò (320px, cuộn độc lập)
- **Cột phải**: Cấu hình quyền theo nhóm menu
  - Groups 1 module: hiển thị flat (ví dụ: Lượng mưa → ☑Xem ☑Nhập ☐Xuất)
  - Groups nhiều module: hiển thị sub-groups (ví dụ: Hệ thống → Tài khoản, Chi nhánh, Quyền hạn)
  - Mỗi group có checkbox "Chọn tất cả" + badge đếm (4/4)

### Files liên quan:
- `src/views/admin/role-matrix/index.jsx` — Layout 2 cột Magento-style
- `src/views/admin/role-matrix/PermissionTree.jsx` — Component cây phân quyền
- `src/menu-items/admin.js` — Menu sidebar (ID = permission code)
- `src/store/useAuthStore.js` — Store quản lý auth + `hasPermission()`

---- MENU HỆ THỐNG VÀ QUẢN TRỊ ----

1. [MENU] Hệ thống báo cáo — 1 trang chat AI
   [BUTTON] Tin nhắn báo cáo (ai:report)
   [BUTTON] Báo cáo tổng hợp (ai:synthesis)
   [BUTTON] Báo cáo sau mưa - Words (ai:post-rain)
   [BUTTON] BC CT KC (ai:report)
   [BUTTON] Chat tự do (ai:chat)

2. [MENU] Lượng mưa
   [CHILD MENU] Bảng mưa
      [BUTTON] xem
   [CHILD MENU] Danh sách mưa
      [BUTTON] xem, tạo, sửa, xoá, export
   [CHILD MENU] So sánh mưa
      [BUTTON] xem, export
   [CHILD MENU] Lịch sử mưa
      [BUTTON] xem

3. [MENU] Điểm ngập
   
   [CHILD MENU] Cập nhật điểm ngập (dashboard)
      [BUTTON] xem, cập nhật (edit), báo cáo (create)
   [CHILD MENU] Giám sát ngập úng
      [BUTTON] xem, sửa, xoá
   [CHILD MENU] Danh sách (trạm đo ngập)
      [BUTTON] xem, tạo, sửa, xoá
   [CHILD MENU] Lịch sử
      [BUTTON] xem

4. [MENU] Mực nước
   [CHILD MENU] Bảng sông hồ
      [BUTTON] xem
   [CHILD MENU] Mực nước hồ → Danh sách
      [BUTTON] xem, tạo, sửa, xoá, export
   [CHILD MENU] Mực nước hồ → Lịch sử
      [BUTTON] xem
   [CHILD MENU] Mực nước sông → Danh sách
      [BUTTON] xem, tạo, sửa, xoá, export
   [CHILD MENU] Mực nước sông → Lịch sử
      [BUTTON] xem

5. [MENU] BC CT KC
   [CHILD MENU] Danh sách
      [BUTTON] xem, tạo, sửa, xoá
   [CHILD MENU] Báo cáo
      [BUTTON] xem, tạo, sửa, xoá, export
   [CHILD MENU] Lịch sử báo cáo
      [BUTTON] xem, sửa

6. [MENU] Cửa phai (⚠️ UnderDevelopment)
   [BUTTON] xem, điều khiển

7. [MENU] Trạm bơm (1 trang)
   [BUTTON] xem, sửa, xoá, điều khiển

8. [MENU] Sa hình ngập (⚠️ UnderDevelopment)
   [BUTTON] xem

9. [MENU] Hệ thống
   [CHILD MENU] Tài khoản
      [BUTTON] xem, tạo, sửa, xoá
   [CHILD MENU] Tạo đơn vị
      [BUTTON] xem, tạo, sửa, xoá
   [CHILD MENU] Phân quyền
      [BUTTON] xem, sửa
   [CHILD MENU] Chức vụ
      [BUTTON] xem, sửa

10. [MENU] Hợp đồng
    [CHILD MENU] AI trợ lý (chat)
       [BUTTON] ai:chat
    [CHILD MENU] Danh sách HĐ
       [BUTTON] xem, tạo, sửa, xoá
    [CHILD MENU] Danh mục
       [BUTTON] xem, sửa, xoá