# Kế hoạch Nâng cấp & Sửa lỗi Module Quản lý Hợp đồng

Tài liệu này trình bày kế hoạch chi tiết để cập nhật, tối ưu hóa và sửa chữa toàn diện các yêu cầu kỹ thuật liên quan đến chức năng Quản lý hợp đồng và Phụ lục hợp đồng trong hệ thống thoát nước Hà Nội (`thoatnuochanoi`).

---

## Các yêu cầu cần giải quyết

1. **Thêm các ô thông tin:** Số hợp đồng, Tên chủ đầu tư, Thành viên liên danh.
2. **Sửa lỗi Form nhập liệu:** Click chuột ra ngoài bị mất hết dữ liệu (đóng dialog ngoài ý muốn).
3. **Định dạng ngày hiển thị:** Đổi toàn bộ các DatePicker của ngày bắt đầu, ngày hết hạn và giai đoạn thanh toán sang định dạng hiển thị `DD/MM/YYYY`.
4. **Sửa lỗi tài liệu đính kèm khi thêm mới:** Tạo hợp đồng mới bị thừa hưởng/trùng tài liệu đính kèm của hợp đồng trước đó.
5. **Sửa lỗi tải tài liệu lên:** Khi tải liên tiếp tệp thứ 2, 3 thì bị mất/xoá các tệp tải lên trước đó.
6. **Mở rộng chức năng tìm kiếm:** Tìm được cả Hợp đồng chính và các Phụ lục hợp đồng kèm theo.
7. **Tối ưu tốc độ tải tệp 48MB:** Phân tích nguyên nhân và đề xuất tối ưu hóa.
8. **Chức năng Phụ lục hợp đồng:** 
   - Quản lý phụ lục hợp đồng bằng cách sử dụng chung bảng dữ liệu `contract` (thông qua trường liên kết `parent_id`).
   - Có nút trỏ thêm phụ lục ở từng hợp đồng chính.
   - Hiển thị danh sách phụ lục lồng khớp dưới hợp đồng chính.

---

## Chi tiết Thay đổi Dự kiến

### 1. Backend (Go - `ai-api-tnhn`)

#### A. Mô hình Dữ liệu (`internal/models/contract.go`)
Bổ sung các thuộc tính mới vào struct `Contract`:
```go
ContractNumber string `bson:"contract_number" json:"contract_number" example:"HD-2026-001"`
InvestorName   string `bson:"investor_name" json:"investor_name" example:"Sở Xây Dựng Hà Nội"`
JVMembers      string `bson:"jv_members" json:"jv_members" example:"Liên danh Công ty A - Công ty B"`
ParentID       string `bson:"parent_id" json:"parent_id" example:"65f...123"`
```

#### B. Logic Nghiệp vụ (`internal/service/contract/methods.go`)
- Cập nhật hàm `Update` để sao chép các trường mới trước khi lưu.
- Cập nhật hàm `List` để giải quyết truy vấn hai chiều khi tìm kiếm:
  - Nếu tìm thấy phụ lục, tự động lấy thêm thông tin hợp đồng cha.
  - Nếu tìm thấy hợp đồng cha, tự động trả về tất cả phụ lục đi kèm.

#### C. Lọc Dữ liệu (`handler/filters/contract_list.go`)
- Thêm trường lọc `ParentID`.
- Mở rộng logic regex tìm kiếm `Name` để khớp trên cả `contract_number`, `investor_name`, và `jv_members`.

---

### 2. Frontend (React - `ai-frontend-tnhn`)

#### A. Cửa sổ Nhập liệu (`ContractDialog.jsx`)
- Tắt cơ chế đóng khi click ra ngoài (`backdropClick`).
- Áp dụng `format="DD/MM/YYYY"` vào toàn bộ `DatePicker`.
- Tối ưu hóa khởi tạo giá trị trong `useEffect` để sửa lỗi trùng lặp và ghi đè danh sách tài liệu đính kèm.
- Thêm 3 trường nhập liệu: Số hợp đồng, Chủ đầu tư, Liên danh.
- Tự động nhận diện nếu đang thêm Phụ lục từ một hợp đồng cha để kế thừa danh mục và điền `parent_id`.

#### B. Dòng Hợp đồng (`ContractRow.jsx`)
- Hiển thị thêm các trường thông tin mới trong panel chi tiết.
- Hiển thị bảng Phụ lục hợp đồng đi kèm và nút "+ Thêm phụ lục".

#### C. Danh sách Hợp đồng (`index.jsx`)
- Lọc hiển thị ngoài danh sách chính chỉ gồm các hợp đồng cấp cha (`!parent_id`).
- Truyền danh sách phụ lục tương ứng xuống mỗi `ContractRow`.