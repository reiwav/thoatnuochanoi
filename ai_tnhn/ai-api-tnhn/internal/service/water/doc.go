/*
Package water chịu trách nhiệm xử lý dữ liệu quan trắc thực tế.

Khác với package `station` (quản lý thông tin trạm), package `water` tập trung vào:
- Truy vấn dữ liệu mực nước hồ và sông theo trạm/ngày.
- Truy vấn dữ liệu lượng mưa chi tiết.
- Tính toán tổng hợp số liệu phục vụ báo cáo.

Mối quan hệ:
- Sử dụng `repository.Rain`, `repository.Lake`, `repository.River` để truy xuất DB.
- Sử dụng `station.Service` để tham chiếu thông tin trạm và phân quyền.
*/
package water
