# Kế hoạch triển khai: Dự báo thời tiết AI (Gemini)

Hệ thống sẽ tích hợp tính năng dự báo thời tiết 3 ngày tới sử dụng mô hình Gemini AI và hiển thị thông tin trực tiếp trên thanh Header của ứng dụng.

## 1. Backend (Go - Gin)

### 1.1. Cấu trúc API
- **Endpoint**: `GET /api/admin/weather/forecast`
- **Mô tả**: Gọi Gemini AI để lấy thông tin dự báo thời tiết dựa trên thời gian thực.
- **Phân quyền**: Yêu cầu Token hợp lệ.

### 1.2. Logic xử lý
- **Prompt**: 
  `Thời gian hiện tại của hệ thống là: [dd/MM/yyyy]. Dự báo thời tiết tại Hà Nội trong 3 ngày tiếp theo như thế nào? Mô tả ngắn gọn, súc tích trong vòng 50 từ.`
- **Service**: 
  - Thêm phương thức `GetForecast` vào `internal/service/weather/service.go`.
  - Sử dụng `geminiService` để thực hiện câu lệnh (gửi prompt và nhận kết quả).
- **Caching**: 
  - Sử dụng bộ nhớ tạm (Cache) để lưu kết quả dự báo trong vòng 2-4 giờ để tối ưu quota API Gemini và cải thiện tốc độ phản hồi.

## 2. Frontend (React)

### 2.1. API Client
- Tạo file `src/api/weather.js` để thực hiện call API `/admin/weather/forecast`.

### 2.2. Header Component (`src/layout/MainLayout/Header/index.jsx`)
- **State**: Lưu trữ chuỗi kết quả dự báo (`weatherForecast`).
- **Effect**: Tự động gọi API khi Header mount.
- **UI Design**: 
  - Vị trí: Hiển thị trên thanh Header ngang, phía trước khu vực thông tin người dùng/đăng xuất.
  - Hiệu ứng: Chữ chạy (Marquee) nếu nội dung dài hoặc hiển thị tĩnh với icon thời tiết tinh tế.
  - Màu sắc: Sử dụng tông màu xám nhẹ hoặc xanh dương nhạt để không làm xao nhãng người dùng nhưng vẫn dễ đọc.

## 3. Các bước thực hiện chi tiết

1. **Bước 1 (Backend)**: Cập nhật interface và implementation của `weather.Service`.
2. **Bước 2 (Backend)**: Đăng ký route mới trong `router/google.go` (hoặc module tương ứng).
3. **Bước 3 (Frontend)**: Xây dựng hàm gọi API trong thư mục `api/`.
4. **Bước 4 (Frontend)**: Chỉnh sửa component Header để hiển thị dữ liệu.
5. **Bước 5 (Kiểm thử)**: Đảm bảo prompt trả về tiếng Việt chuẩn và hiển thị đẹp trên cả mobile/desktop.

---
> [!TIP]
> Do API dự báo thời tiết dựa vào Gemini là dạng văn bản tự do, chúng ta sẽ tối ưu CSS để dữ liệu hiển thị không bị tràn khung trên thanh Header.