/*
Package weather là domain service chịu trách nhiệm xử lý các nghiệp vụ liên quan đến thời tiết và khí tượng.

Cấu trúc file:
- rain.go: Xử lý dữ liệu lượng mưa thực tế và lịch sử.
- water.go: Xử lý dữ liệu mực nước (được tách từ domain water để phục vụ mục đích hiển thị tổng hợp).
- forecast.go: Xử lý logic dự báo và định dạng văn bản cho người dùng/AI.
- service.go: Định nghĩa core interface và quản lý phụ thuộc (dependency injection).

Trách nhiệm chính:
- Tổng hợp báo cáo mưa và mực nước.
- Tính toán so sánh lượng mưa giữa các năm.
- Cung cấp dữ liệu dự báo đã được định dạng chuẩn (DRY).
*/
package weather
