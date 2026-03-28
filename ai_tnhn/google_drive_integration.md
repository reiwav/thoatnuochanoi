# Tài liệu tích hợp Google Drive vào hệ thống Quản lý hợp đồng

Tài liệu này mô tả chi tiết quá trình tích hợp Google Drive để lưu trữ tài liệu hợp đồng, bao gồm cấu trúc thư mục tự động và tính năng upload ngay khi tạo mới.

## 1. Cấu hình (Configuration)

Các thông số cấu hình Google Drive hiện được định nghĩa trong file `ai-api-tnhn/config/env.go`. Ứng dụng sử dụng cơ chế `envDefault` (giá trị mặc định) trong Go nếu không tìm thấy các biến môi trường tương ứng trong file `.env` hoặc hệ thống.

**Các biến quan trọng (trong `env.go`):**
- `REIWAYGOOGLE_DRIVE_ROOT_FOLDER_ID`: ID của thư mục gốc trên Drive để chứa tất cả dữ liệu (Hiện tại: `1L_woTCeU-nEaO2iyd5sV8xlbOndHKb6T`).
- `REIWAYGOOGLE_CREDENTIALS`: JSON chứa thông tin Service Account để xác thực.

**Tại sao không có trong `.env`?**
Hiện tại ứng dụng được cấu hình để đọc trực tiếp các giá trị mặc định từ code (`envDefault`). Bạn có thể tạo file `.env` tại thư mục `ai-api-tnhn` và thêm các biến trên nếu muốn ghi đè (override) các giá trị mặc định này mà không cần sửa code.

## 2. Quá trình triển khai (Implementation Process)

### A. Cấu trúc lưu trữ (Folder Hierarchy)
Để quản lý khoa học, hệ thống tự động tạo cấu trúc thư mục theo thời gian thực tế:
`CONTRACTS / [Tên Danh Mục] / [Năm (YYYY)] / Tháng [MM] / Ngày [DD] / [Tên Hợp Đồng]`

**Ví dụ:** `CONTRACTS/Hợp đồng kinh tế/2026/Tháng 03/Ngày 28/Hợp đồng mẫu số 01`

### B. Thay đổi Backend (Go API)
1. **Model**: Thêm trường `drive_folder_id` và `drive_folder_link` vào model `Contract` và `ContractCategory` để lưu vết Drive.
2. **Google Drive Service**: 
   - Bổ sung phương thức `MoveFile` để hỗ trợ việc thay đổi danh mục (Khi hợp đồng đổi danh mục, thư mục trên Drive cũng sẽ được di chuyển tương ứng).
   - Bổ sung phương thức `GetFolderLink` để tạo link mở thư mục trực tiếp.
3. **Contract Service**: 
   - Cập nhật hàm `ensureDriveFolder` để xử lý việc tạo cấu trúc thư mục phân tầng Năm/Tháng/Ngày.
   - Thêm phương thức `PrepareDriveFolder` cho phép tạo thư mục Drive trước khi bản ghi hợp đồng được lưu vào Database.
   - Thêm phương thức `UploadToFolder` để tải file trực tiếp vào một Folder ID cụ thể.
4. **Router & Handler**:
   - Thêm route `POST /admin/contracts/prepare-folder` để frontend gọi khi bắt đầu upload file ở chế độ tạo mới.
   - Thêm route `POST /admin/contracts/upload-to-folder` để upload file dựa trên Folder ID.

### C. Thay đổi Frontend (React)
1. **API Client**: Cập nhật file `api/contract.js` với các phương thức `prepareFolder` và `uploadToFolder`.
2. **Contract Dialog**: 
   - Mở rộng khu vực "Tài liệu Google Drive" cho cả chế độ **Thêm mới** và **Chỉnh sửa**.
   - Logic: Khi người dùng chọn file để upload ở chế độ **Thêm mới**, hệ thống sẽ tự động gọi `prepareFolder` (với điều kiện đã nhập Tên và Danh mục) để lấy `drive_folder_id` trước khi upload file.
   - Khi nhấn **Lưu**, `drive_folder_id` này sẽ được gửi kèm để lưu vào MongoDB.

## 3. Cách thức hoạt động
- **Khi tạo Hợp đồng**: Chọn Danh mục -> Nhập Tên -> Chọn file Upload -> Hệ thống tạo thư mục Drive -> Tải file lên -> Nhấn Lưu -> Lưu ID thư mục vào DB.
- **Khi sửa Hợp đồng**: Bạn có thể upload thêm file vào cùng thư mục. Nếu bạn đổi **Danh mục** của hợp đồng, hệ thống sẽ tự động chuyển thư mục của hợp đồng đó sang danh mục mới trên Drive.
- **Khi xem**: Một nút "Mở thư mục trên Drive" luôn xuất hiện để bạn có thể quản lý file trực tiếp trên giao diện Google Drive.

---
*Ghi chú: Mọi lỗi xảy ra trong quá trình làm việc với Drive sẽ không làm gián đoạn việc lưu dữ liệu vào Database, nhưng sẽ hiển thị thông báo lỗi để người quản trị nắm bắt.*
