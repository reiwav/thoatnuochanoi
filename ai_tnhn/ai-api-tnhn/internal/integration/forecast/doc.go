/*
Package forecast cung cấp các phương thức tích hợp để lấy dữ liệu dự báo thời tiết từ các API bên thứ ba (mặc định là Open-Meteo).

Trách nhiệm chính:
- Lấy dự báo thời tiết khu vực Hà Nội cho các ngày tới.
- Xử lý và chuyển đổi dữ liệu từ API bên ngoài sang cấu trúc dữ liệu nội bộ.

Mối quan hệ:
- Được sử dụng bởi `internal/service/weather` để cung cấp thông tin dự báo cho người dùng và AI.
*/
package forecast
