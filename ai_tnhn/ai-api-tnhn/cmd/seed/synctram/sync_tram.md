Tôi cần cập nhật lại các thông tin đang chưa có của trạm mưa, sông hồ. Cụ thể là:
- Lấy dữ liệu ở database của các trạm mưa, sông hồ cũ để cập nhật lại cho các trạm mưa, sông hồ mới.
- Các thông tin cần cập nhật là: `old_id`, tên trạm, địa chỉ, vĩ độ, kinh độ, loại, đơn vị quản lý, chia sẻ đơn vị quản lý, thứ tự, trọng số báo cáo, ngưỡng cảnh báo, trạng thái hoạt động.
- Các trạm mưa, sông hồ cũ được lấy từ file:
    - Trạm mưa: `/Users/longtran/Desktop/Golang/ThoatNuocHaNoi/application/ai_tnhn/tools/rainfall_processor/tram_mua_data.json`
    - Sông hồ: `/Users/longtran/Desktop/Golang/ThoatNuocHaNoi/application/ai_tnhn/tools/rainfall_processor/tram_nuoc.json`

## Kế hoạch thực hiện:
1. **Khởi tạo Tool**: Tạo script tại `cmd/seed/synctram/main.go`.
2. **Đọc dữ liệu**: Parse các file JSON vào các struct tạm thời.
3. **Ánh xạ dữ liệu**:
    - Sử dụng `Id` trong JSON để khớp với `old_id` trong database.
    - Duyệt qua từng bản ghi trong DB, nếu tìm thấy `old_id` tương ứng trong JSON thì cập nhật các trường thông tin.
    - trường hợp không khớp old_id thì phải lấy theo tên
4. **Cập nhật Database**:
    - Trạm mưa: Cập nhật `TenTram`, `TenPhuong`, `DiaChi`, `Lat`, `Lng`, `ThuTu`, `Active`.
    - Sông hồ: Cập nhật `TenTram`, `TenTramHTML`.
5. **Ghi chú**: Chỉ cập nhật các trường có trong file JSON, các trường khác giữ nguyên.
Nếu DB chưa có thì tạo mới