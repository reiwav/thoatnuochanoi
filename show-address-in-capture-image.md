# Kế hoạch Chi tiết: Hiển thị Thời gian và Địa chỉ trên Ảnh Chụp

## 1. Mục tiêu
Tự động đóng dấu (watermark) thông tin **Thời gian thực** và **Địa chỉ/Vị trí** trực tiếp lên hình ảnh ngay khi người dùng chọn/chụp ảnh từ thiết bị. Điều này giúp tăng tính minh bạch và độ chính xác cho các báo cáo hiện trường (ngập lụt, tiến độ thi công).

## 2. Các vị trí cần sửa đổi
Dựa trên khảo sát mã nguồn, các vị trí có chức năng chụp/chọn ảnh hiện trường cần xử lý gồm:
1. **Báo cáo Ngập lụt**: `src/views/employee/inundation/InundationReportPanel.jsx`
2. **Cập nhật Tiến độ Công trình**: `src/views/employee/emergency-construction/ConstructionForm.jsx`

## 3. Giải pháp Kỹ thuật chi tiết

### 3.1. Xây dựng Utility dùng chung: `src/utils/imageProcessor.js`
Tạo một module chuyên dụng để xử lý ảnh trước khi upload.

**Chức năng của utility:**
- **Resize & Nén**: Đưa ảnh về kích thước tối ưu (ví dụ: tối đa 1024px chiều rộng) để tiết kiệm băng thông.
- **Watermarking**: 
    - Vẽ ảnh lên một `Canvas`.
    - Xác định vị trí đóng dấu (thường là góc dưới bên trái hoặc bên phải).
    - Vẽ dải nền tối (mờ) để đảm bảo chữ luôn nổi bật trên mọi tấm hình.
    - Vẽ văn bản: 
        - Dòng 1: 🕒 `DD/MM/YYYY HH:mm:ss`
        - Dòng 2: 📍 `Địa chỉ/Tên tuyến đường/Toạ độ GPS`

### 3.2. Cập nhật logic tại các Form

#### A. Đối với InundationReportPanel (Báo cáo Ngập lụt)
- Hiện tại đã có hàm `resizeImage`. Cần nâng cấp hàm này hoặc thay thế bằng utility mới.
- Tham số địa chỉ sẽ lấy từ `values.street_name` (Tên tuyến đường/Vị trí).

#### B. Đối với ConstructionForm (Tiến độ thi công)
- Hiện tại hàm `handleImageChange` chưa có logic xử lý ảnh.
- Cần tích hợp utility mới để xử lý ảnh ngay sau khi người dùng chọn file.
- Tham số địa chỉ lấy từ trường `location` trong form.

## 4. Các bước triển khai (Workflow)

1.  **Bước 1**: Tạo file `src/utils/imageProcessor.js` với hàm `processAndWatermark(file, address)`.
    - Sử dụng `FileReader` để đọc file.
    - Sử dụng `Image` và `Canvas` để xử lý.
    - Trả về một `File` object mới đã được đóng dấu.
2.  **Bước 2**: Import và áp dụng vào `InundationReportPanel.jsx`.
    - Thay thế phần `resizeImage` cũ.
    - Truyền `values.street_name` vào hàm xử lý.
3.  **Bước 3**: Import và áp dụng vào `ConstructionForm.jsx`.
    - Chỉnh sửa `handleImageChange` để lặp qua danh sách file và xử lý từng file qua utility.
    - Truyền biến `location` vào hàm.
4.  **Bước 4**: Kiểm tra hiển thị trên thiết bị di động.
    - Kiểm tra độ sắc nét của chữ trên các kích cỡ màn hình khác nhau.
    - Đảm bảo không làm chậm trải nghiệm người dùng quá nhiều khi chọn nhiều ảnh cùng lúc.

## 5. Mẫu định dạng dự kiến trên ảnh
```text
---------------------------------------
|                                     |
|           [HÌNH ẢNH HIỆN TRƯỜNG]    |
|                                     |
|                                     |
| 🕒 31/03/2026 11:30:45              |
| 📍 123 Đường Láng, Đống Đa, Hà Nội  |
---------------------------------------
```
