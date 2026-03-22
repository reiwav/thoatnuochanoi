# Kế hoạch triển khai Chat AI cho Sensor Data

Hệ thống sẽ tích hợp Gemini AI với khả năng Function Calling để truy vấn dữ liệu cảm biến và lịch sử vượt ngưỡng.

## 1. Backend (Golang)
- **Cấu hình**: Thêm `GeminiToken` vào `Config` struct (`config/config.go`).
- **Models**: Định dạng dữ liệu Chat (`internal/models/ai.go`).
- **AI Service**:
    - Tích hợp Google Gemini SDK (`github.com/google/generative-ai-go/genai`).
    - Cấu hình Function Calling với các hàm:
        - `get_monitor_data(link)`: Lấy trạng thái hiện tại.
        - `get_alarms(link)`: Lấy các cảnh báo gần đây.
        - `get_history_trend(link, channel, start_date, end_date)`: Lấy dữ liệu lịch sử.
        - `list_devices()`: Liệt kê danh sách các trạm.
- **Handler**: Tạo `AIHandler` xử lý request chat.
- **Router**: Đăng ký endpoint `POST /api/ai/chat`.

## 2. Frontend (React)
- **Giao diện**: Tạo view `ChatAI.jsx` với thiết kế cao cấp (giống Gemini).
- **Tính năng**:
    - Hiển thị tin nhắn dạng bubble.
    - Hỗ trợ Markdown cho câu trả lời của AI.
    - Hiệu ứng loading và tự động scroll.
- **Navigation**: Thêm menu "Chat AI" vào Sidebar và cấu hình route trong `App.jsx`.

## 3. Các bước thực hiện
1. Cập nhật cấu hình và cài đặt dependency (SDK Gemini).
2. Triển khai AI Service và Function Calling ở Backend.
3. Xây dựng giao diện Chat và kết nối API ở Frontend.
4. Kiểm thử khả năng phân tích của AI đối với các câu hỏi: "Trạm A có cảnh báo gì không?", "Dữ liệu lịch sử kênh 1 trạm B ngày hôm qua thế nào?".