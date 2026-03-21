# Kế hoạch đồng bộ Channel Mapping cho Lịch Sử (History Trend) theo từng Trạm

## 1. Vấn đề hiện tại bạn gặp phải
Bên trong bo mạch, các trạm máy cấu hình phần cứng (ví dụ IP `119` và IP `175`) có **thứ tự các kênh cảm biến (Channel ID) không hề giống nhau**. Việc gọi code chạy cứng ID `0, 1, 2...` dựa trên Config UI trên giao diện web sẽ dẫn đến "lấy râu ông nọ cắm cằm bà kia":
- Ở Trạm 119: Macro ID `1` trả về dữ liệu `Temp`.
- Ở Trạm 175: Macro ID `2` (hoặc số khác) lại trả về `Temp`.

Do đó, lấy Data theo số quy định tĩnh sẽ lưu sai bét loại dữ liệu trên Database.

## 2. Giải pháp đề xuất: Dynamic Channel Mapping (Khớp mã tự động)

Quy trình hoạt động của tool `fetch_history` khi tới một Thiết bị (`device`) mới sẽ phải đổi lại như sau:

### Bước 1: Quét `Listnamechannel` để lấy vị trí thật của Bo mạch (Real-time Mapping)
Trước khi gọi vòng lặp thời gian, Tool sẽ request 1 Call duy nhất vào `{link}/macros/Listnamechannel/`.
API này sẽ trả ra dữ liệu dạng Text:
```text
pH
Temp
COD
TSS
Flow out 1
```
Code Golang sẽ **tách từng dòng** và gán chỉ số (Index bắt đầu từ 0) thành 1 Từ điển Thực Tế (Real Map) của trạm đó:
👉 Map 119: `{ "pH": 0, "Temp": 1, "COD": 2, ...}`
👉 Map 175: `{ "pH": 0, "COD": 1, "Temp": 2, ...}`

### Bước 2: Lấy dữ liệu theo ID Thực Tế (Real ID) và đồng bộ Const
Sử dụng chuẩn hằng số của backend `constants.SensorLabels` (pH, Temp, COD, TSS...) để đối chiếu. 
- Muốn lấy `Temp`? Gõ vào Real Map của trạm 175 lấy ra chỉ số `ID = 2`.
- Tool gọi thẳng `{link}/macros/load_history_date_channel/2,2026-03-01,2026-03-19`. Dữ liệu đổ về lúc này chắc chắn 100% là của `Temp`.

### Bước 3: So sánh Cấu Hình Lưu Database Bằng Đúng Constant Sensor
Khi có dữ liệu `Temp`, Tool sẽ chọc ngược vào `device.Config` để lấy ra `WarningSet` và `HighAlarmSet`.
- Áp dụng kiểm tra Vượt ngưỡng (Status 0, 1, 2).
- **QUAN TRỌNG:** Ghi xuống Database Collection `history_trend` thay vì dùng cái `Code` bằng chữ hay `ID API của phần cứng`, Tool sẽ **lưu bằng đúng thứ tự `SensorType` khai báo trong `constants/sensor.go`**. 
- Cụ thể: Ở Trạm 175 gọi API Data bằng `ID = 2`, nhưng lúc lưu xuống DB thì ghi mác bằng `SensorType = 1` (Theo `SensorTemp = 1` của mình). 
- Kết quả: Tất cả các trạm trong Cơ Sở Dữ Liệu đều lưu nhất quán (0 là pH, 1 là Temp, 2 là COD...). Không bao giờ bị lệch!

### Bước 4: Tối ưu hiệu năng ghi (Chunking & BulkWrite)
Nếu tải dữ liệu từ đầu năm, số lượng bản ghi có thể lên tới chục nghìn điểm mỗi kênh. Không thể dùng hàm tạo hay update lẻ tẻ từng Record vào Database vì gây quá tải Network và sập Tool.
- Tool sẽ áp dụng **mô hình Chunking (đóng gói dữ liệu)**: Khởi tạo một mảng bộ nhớ đệm (Batch) chứa tối đa 1000 lệnh `Upsert`.
- Cứ sau khi xử lý xong 1000 điểm dữ liệu (Hoặc khi hết dữ liệu 1 Cảm biến), Tool mới đẩy hàm `BulkWrite` xuống MongoDB 1 lần duy nhất để giải phóng Transaction. 
- Giúp tốc độ chép và đè dữ liệu tốn cực ít RAM và nhanh hơn gấp 20 lần so với thông thường!

### Bước 5: Chống Tạp/Trùng Dữ Liệu bằng Bộ Khoá Độc Quyền (Compound Unique Index)
Khi bạn chạy đi chạy lại cái Tool này, nếu không cấu hình Index thì Database sẽ sinh ra bản ghi gối lên nhau, Data ảo tràn lan. Vì vậy mình thiết lập:
- Một **Unique Index gộp 3 trường** ở MongoDB: `device_link` + `sensor_type` + `timestamp`.
- Trong hàm chèn dữ liệu (`BulkWrite`), mình dùng cờ `$set` và `SetUpsert(true)`. 
- Nhờ Index này: Giả sử Data Cũ đã từng được lưu vào Mốc Thời gian A, thì lần chạy sau nó chỉ nhẹ nhàng Cập Nhật (Update đè) dữ liệu lên mốc đấy chứ không đẻ ra Mốc B khác. Đảm bảo toàn vẹn dữ liệu cho Database sạch bong sứt kính!

---

## 3. Hướng dẫn chạy Tool `fetch_history`
Mở một Tab Terminal / Command Prompt mới, trỏ vào thư mục `backend` và chạy lệnh sau tuỳ theo nhu cầu lấy dữ liệu:

1. **Lấy dữ liệu tự động 1 ngày (Today):**
   *(Chế độ an toàn mặc định để test nhẹ, tránh làm sập phần cứng Bo mạch RPi)*
   ```bash
   go run tools/fetch_history/main.go
   ```

2. **Lấy dữ liệu toàn bộ theo khoảng thời gian tuỳ ý (Custom Range):**
   Bạn truyền 2 tham số `Ngày Bắt Đầu` và `Ngày Kết Thúc` vào sau lệnh (Định dạng `YYYY-MM-DD`):
   ```bash
   go run tools/fetch_history/main.go 2025-08-05 2025-09-05
   ```

Lưu ý: Tool sẽ in ra Terminal trực tiếp từng bước nó đang quét Trạm nào, lấy Kênh nào (`Temp` hay `pH`), và số lượng BulkWrite chèn đè hoặc thêm mới thành công bao nhiêu bản ghi để bạn dễ dàng Monitor. Cứ vứt đấy cho nó kéo background là Database ngập tràn Data chuẩn mượt!

Đã đảo vòng lặp lên trên: Bây giờ tool sẽ quét tuần tự từng ngày (from startDate to endDate).
Trong mỗi ngày: Sẽ kéo lần lượt dữ liệu của từng kênh cấu hình (pH, Nhiệt độ, COD...). Giữa các kênh sẽ nghỉ nhẹ 0.5s để server không bị đơ giật.
Giữa mỗi ngày: Sau khi insert xong đống bản ghi của ngày đó vào cơ sở dữ liệu, tool sẽ hiện log Finished date ... Sleeping 5s before next date... và thật sự chờ 5 giây rồi mới nhúc nhích sang ngày tiếp theo, tránh bị block IP hay sập server!

# Chạy seed data 
```bash
go run tools/seed_devices/main.go
```

# Chạy lệnh kéo riêng một kênh bị lỗi (Single Fetch Tool)
Nếu bạn chỉ muốn kéo lại dữ liệu thiếu của đúng 1 thiết bị và đúng 1 kênh cụ thể (Ví dụ: Trạm 119, Kênh 1) từ ngày `08` đến ngày `10`, bạn dùng tool `fetch_single` kèm 4 tham số: `link`, `channelID`, `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD). Tool sẽ tự động tìm tên kênh, tính toán Warning/High và ghi vào DB.

```bash
go run tools/fetch_single/main.go "http://14.224.214.119:8880" 1 "2025-08-05" "2025-09-05"
```
chỉ có data từ 05/08/2025

go run tools/fetch_history/main.go 2025-11-10 2026-01-01

go run tools/fetch_single/main.go "http://14.224.214.119:8880" 0 "2025-09-13" "2025-09-13"