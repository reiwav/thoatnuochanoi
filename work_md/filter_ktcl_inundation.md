# Thêm Filter KTCL đã kiểm tra — `/admin/inundation`

## Phân tích vấn đề

### Data model hiện tại

Mỗi **điểm ngập** (`InundationStation`) có:
- `report_id`: ID report đang active (có nghĩa là đang ngập). Trống nếu bình thường.
- `last_report_id`: ID report gần nhất (kể cả đã resolved).

Mỗi **InundationReport** (last_report trả về từ API) chứa:
- `ktcl_checked` (bool): KTCL đã kiểm tra hay chưa
- `ktcl_updated_at` (unix timestamp): Thời điểm KTCL kiểm tra gần nhất  
- `ktcl_user_name`: Tên người KTCL kiểm tra

### Vấn đề mấu chốt

| Trạng thái điểm | `report_id` | `last_report` chỉ vào | Vấn đề |
|---|---|---|---|
| **Đang ngập** | ✅ có | Report active | `ktcl_checked` có ý nghĩa rõ ràng |
| **Bình thường** | ❌ trống | Report resolved (bình thường) | KTCL vẫn đang kiểm tra hàng ngày, ghi vào report này |

Khi điểm ở trạng thái **bình thường**, hệ thống vẫn dùng `getOrCreateActiveReport()` → trả về `last_report` hiện tại (đã resolved). Khi KTCL gửi kiểm tra, data được cập nhật vào **đúng report resolved này** (`sub_ktcl_report.go`).

→ Vậy `ktcl_updated_at` trong `last_report` **luôn phản ánh** lần kiểm tra gần nhất, kể cả khi điểm bình thường.

## Đề xuất giải pháp

### Phương án: Filter theo `ktcl_updated_at` so với ngày hôm nay

Logic: Một điểm coi là "KTCL đã kiểm tra" nếu `last_report.ktcl_updated_at` rơi vào **ngày hôm nay**. Nếu không có hoặc là ngày khác → "Chưa kiểm tra".

> Phương án này hoạt động **chính xác** cho cả 2 trường hợp:
> - Điểm đang ngập: KTCL cập nhật vào report active → `ktcl_updated_at` = hôm nay ✅
> - Điểm bình thường: KTCL cập nhật vào report resolved hiện tại → `ktcl_updated_at` = hôm nay ✅

**Filter UI**: Thêm 1 select vào `InundationFilterBar.jsx` với 3 giá trị:
- **Tất cả** (mặc định)
- **KTCL đã kiểm tra** (hôm nay)  
- **KTCL chưa kiểm tra** (hôm nay)

### Proposed Changes

#### Frontend (không cần sửa backend)

##### [MODIFY] `InundationFilterBar.jsx`
- Thêm 1 `TextField` select mới cho filter KTCL với 3 options: `all`, `checked`, `not_checked`

##### [MODIFY] `useAdminInundation.js`
- Thêm logic filter trong `filteredPoints`:
  - `checked`: `last_report.ktcl_updated_at` rơi vào ngày hôm nay
  - `not_checked`: `last_report.ktcl_updated_at` không tồn tại hoặc không phải hôm nay

##### [MODIFY] `useInundationStore.js`
- Thêm `ktclFilter: 'all'` vào initial state của `filters`

> **Không cần sửa backend.** Data `ktcl_updated_at` đã có sẵn trong `last_report` trả về từ API `points-status`.

## Open Questions

1. **Mốc thời gian "hôm nay" là gì?** Từ 00:00 ngày hiện tại (theo timezone Việt Nam, UTC+7)? Hay từ 1 khoảng thời gian cố định (vd: 6h sáng)?
2. **Có muốn hiển thị thêm count** (số điểm đã/chưa kiểm tra) trên filter giống như đã làm ở pumping station summary không?
3. **Có muốn filter tương tự cho Khảo sát (survey) và Cơ giới (mech)** không? Data `survey_updated_at` và `mech_updated_at` cũng có sẵn.
