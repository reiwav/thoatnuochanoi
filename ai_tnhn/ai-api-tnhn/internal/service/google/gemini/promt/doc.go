/*
Package promt quản lý và cung cấp các chỉ dẫn hệ thống (prompts) cho AI.

Cơ chế hoạt động:
- Các prompt được lưu trữ trong các file .txt thuần túy trong cùng thư mục.
- Sử dụng `//go:embed` để nhúng các file text vào file thực thi binary.
- Hàm init() tự động load các file vào bộ nhớ để truy vấn nhanh qua key.

Cách cập nhật prompt:
1. Chỉnh sửa nội dung trong file .txt tương ứng.
2. Build lại ứng dụng. Không cần thay đổi mã nguồn Go.
*/
package promt
