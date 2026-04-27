# Kế hoạch Tích hợp Đồng bộ Biểu đồ Lượng Mưa (Rain Chart Scraper)

Kế hoạch này phác thảo các bước để đưa luồng cào dữ liệu biểu đồ mưa (hiện đang nằm ở `tools/rainfall_processor/rain_scraper.go`) vào hệ thống backend chính (`ai-api-tnhn`).

## Background

Tool chạy độc lập hiện tại đã lấy thành công dữ liệu biểu đồ mưa (lượng mưa `LuongMua` theo từng thời điểm `ThoiGian`) từ hệ thống `thoatnuochanoi.vn` thông qua API AJAX `type=solieumua`. Tuy nhiên, hệ thống backend chính hiện chỉ có struct `models.RainRecord` và các repository cơ bản mà chưa có worker để chạy định kỳ tự động lấy dữ liệu này, cũng như chưa có API để trả dữ liệu cho Frontend/Mobile.

## Phản hồi từ người dùng (User Review Required)

- **Chu kỳ chạy (Sync Interval):** Worker nên chạy bao lâu một lần?  15 phút, 30 phút
- **Session ID (Cookie Login):** Hệ thống bên ngoài yêu cầu `ASP.NET_SessionId`. Backend của mình đã có luồng nào chuẩn hoá để lấy/lưu session này chưa, hay Worker này sẽ phải tự động trigger luồng login/cào session riêng? không cần lưu. fix cứng session id
- **Khoảng thời gian quét (Date Range):** Worker có nên chỉ quét dữ liệu của ngày "hôm nay", hay nên quét lùi lại 1-2 ngày trước để phòng trường hợp bị sót/mất mạng? Nên lấy thời gian cuỗi cùng rồi tiếp tục quét Xem ngày xong lấy từ ngày đó. Phải check thời gian, nếu đã có thì skip

## Chi tiết Thay đổi Đề xuất

### Database & Models

Chúng ta sẽ tận dụng struct `models.RainRecord` hiện có trong `internal/models/water.go` và repository tại `internal/repository/query/water.go`. 

**Mapping:**  
Chúng ta sẽ map thông qua `OldID`. Trong `models.RainStation` có trường `OldID`, trường này tương ứng với param `tram` trên API của thoát nước Hà Nội. `RainRecord.StationID` sẽ lưu trữ chính `OldID` này để dễ dàng truy vấn.

### Worker (Đồng bộ Dữ liệu)

Chúng ta sẽ tạo một background worker mới, tương tự như `SyncWorker` của điểm ngập.

#### [NEW] `internal/service/station/water/worker.go`
- Tạo struct `RainWorker`.
- Lấy toàn bộ danh sách các trạm mưa đang hoạt động (active) từ database (`RainStation`).
- Tạo vòng lặp định kỳ (dùng `time.Ticker` hoặc `cron`) gọi tới `https://thoatnuochanoi.vn/qlnl/Contains/ajax/phai.ashx?type=solieumua&tram={old_id}&ngay={date}`.
- Parse JSON trả về để lấy mảng dữ liệu.
- Lưu trữ (Upsert/Insert) các bản ghi vào collection `rain_records` thông qua `rainRepository`.

### Service Layer

#### [MODIFY] `internal/service/station/water/service.go`
- Khởi tạo và chạy `RainWorker` khi khởi động service.
- Thêm method `GetRainChart(ctx context.Context, stationOldID int64, date string) ([]*models.RainRecord, error)` để truy xuất dữ liệu từ Database.

### API Handlers & Routing

#### [MODIFY] `handler/water.go`
- Thêm hàm handler `GetRainChart(c *gin.Context)` để xử lý request lấy biểu đồ mưa.

#### [MODIFY] `router/water.go`
- Đăng ký route mới, ví dụ: `GET /api/v1/water/rain/chart/:station_old_id`.

## Kế hoạch Kiểm tra (Verification Plan)

### Automated Tests
- Kiểm tra logic parse JSON trả về từ API ngoài xem có ánh xạ đúng vào struct `models.RainRecord` hay không.

### Manual Verification
- Chạy thử backend `ai-api-tnhn`.
- Xem log để đảm bảo `RainWorker` hoạt động ổn định, fetch dữ liệu và insert thành công vào MongoDB.
- Dùng Postman/cURL gọi vào API `GET /api/v1/water/rain/chart/:station_old_id` để xác minh format dữ liệu trả về cho Frontend đã chính xác.
