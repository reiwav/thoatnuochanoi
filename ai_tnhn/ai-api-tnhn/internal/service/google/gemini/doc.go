/*
Package gemini cung cấp dịch vụ trợ lý ảo AI dựa trên mô hình ngôn ngữ lớn (LLM) của Google.

Kiến trúc:
- Tool-based: AI có khả năng gọi các hàm chuyên biệt (tools) để truy vấn dữ liệu thực tế từ hệ thống.
- Handler-based: Các tool call được phân nhóm và xử lý bởi các file handler riêng biệt (handler_weather.go, handler_pumping.go, v.v.) qua hàm handleToolCall.
- Prompt-based: Các chỉ dẫn hệ thống được quản lý tập trung và nhúng vào bộ nhớ.

Trách nhiệm chính:
- Xử lý hội thoại thông minh với người dùng.
- Trích xuất thông tin từ file PDF báo cáo.
- Quản lý hợp đồng (ChatContract) và tiến độ thi công (Emergency Construction).
*/
package gemini
