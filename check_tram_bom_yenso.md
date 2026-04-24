# Báo cáo kiểm tra Job Trạm bơm Yên Sở

## 1. Tình trạng hiện tại
- **Lỗi**: Hệ thống đã ngừng ghi nhận dữ liệu từ trạm bơm Yên Sở từ lúc **08:05:35** sáng nay.
- **Nguyên nhân**: 
    - Log hệ thống ghi nhận lỗi `read tcp ...: operation timed out`. Kết nối đến máy chủ SCADA (`thoatnuochanoi.vn`) bị treo hoặc ngắt quãng.
    - Worker hiện tại không có cơ chế tự động reconnect đủ mạnh (không có timeout cho HTTP Client và không kiểm tra heartbeat của SignalR). Nếu kết nối bị "treo" (half-open) mà không đóng hẳn, Worker sẽ đứng đợi dữ liệu mãi mãi.
    - Dữ liệu `rcvWaterLevel` (mực nước) đang bị bỏ qua, hệ thống chỉ lấy `rcvPumpStatus` (trạng thái bơm).

## 2. Các lỗi phát hiện trong Code
1.  **Thiếu Timeout**: `http.Client` trong `worker.go` không có timeout, dẫn đến nguy cơ treo job nếu server không phản hồi.
2.  **Xử lý initialized**: Thông báo `"initialized"` của SignalR bị pass qua hàm unmarshal gây lỗi log không cần thiết.
3.  **Dữ liệu thiếu**: Trạm bơm DPS đã được bật `is_auto` nhưng chưa có `link` nên không thể chạy.
4.  **Deduplication logic**: Chỉ lưu khi có sự thay đổi. Nếu trạm ổn định trong thời gian dài, sẽ không thấy bản ghi mới (đây là tính năng nhưng có thể khiến người dùng tưởng lỗi).

## 3. Cách Fix (Đã/Sẽ triển khai)
1.  **Cập nhật Timeout**: Thêm `Timeout` (30s) cho quá trình Negotiate và dùng `Context` có timeout để quản lý vòng đời kết nối.
2.  **Bổ sung Log Debug**: Thêm log chi tiết về dữ liệu raw nhận được để dễ dàng trace lỗi sau này.
3.  **Hỗ trợ Mực nước**: Sẽ cập nhật code để lưu cả dữ liệu mực nước từ thông điệp `rcvWaterLevel`.
4.  **Reconnect Heartbeat**: Thêm cơ chế nếu sau 5 phút không nhận được bất kỳ message nào (kể cả heartbeat `{}`) thì sẽ tự động đóng kết nối cũ và reconnect.

## 4. Dữ liệu thực tế kiểm tra (08:42)
- Trạm bơm Yên Sở: Đang chạy **1** máy, **8** máy đang đóng, **11** máy báo lỗi/bảo trì (Fault=1).
- Tổng 20 máy (khớp với cấu hình).
