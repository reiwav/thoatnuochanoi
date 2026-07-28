# Public API cho Third-Party (Phiên bản v1)

Tài liệu thiết kế các API cung cấp dữ liệu cho bên thứ ba (hiện tại ưu tiên cho đối tác CIC). Trong phase 1, toàn bộ cấu hình xác thực sẽ được hardcode trong source code để triển khai nhanh chóng. Việc lưu trữ xuống Database sẽ được thực hiện ở phase sau.

## 1. Cơ chế Xác thực (Authentication) bằng RSA

Sử dụng chữ ký điện tử RSA (RS256).

### 1.1. Lưu trữ Key (Phase 1)
Thay vì tạo bảng `ThirdPartyApp` trong DB, chúng ta sẽ định nghĩa một map hằng số (constants) trong code:
```go
// internal/constant/public_client.go
var PublicClients = map[string]struct{
    AppName   string
    PublicKey string
}{
    "cic_app": {
        AppName: "Đối tác CIC",
        PublicKey: `-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----`,
    },
}
```

### 1.2. Quy trình gửi Request của Client (CIC)
Client cần gửi request kèm theo các headers sau:
- `X-App-Id`: ID của đối tác (Ví dụ: `cic_app`).
- `X-Timestamp`: Thời gian gọi API (Unix timestamp) để chống Replay Attack (giới hạn sai lệch 5 phút).
- `X-Signature`: Chữ ký điện tử. Client tự ghép chuỗi `AppID + Timestamp + URL Path`, sau đó hash và ký bằng **Private Key** của họ, mã hóa Base64 và đặt vào header này.

### 1.3. Server Middleware
- Nhận Request, kiểm tra `X-Timestamp` xem có quá hạn không.
- Tra cứu `X-App-Id` trong map `PublicClients` để lấy `PublicKey`.
- Sử dụng `PublicKey` để verify `X-Signature`.
- Nếu hợp lệ thì cho request đi tiếp, không thì trả về 401 Unauthorized.

## 2. Giới hạn truy cập (Rate Limiting)
- Sử dụng Rate Limiter cấu hình trong Middleware. 
- Mức giới hạn cấu hình mặc định (VD: 100 req/min) áp dụng trên mỗi `AppID`.

## 3. Danh sách Endpoints

Các API được thiết kế theo chuẩn RESTful, nhóm trong router `/api/public/v1`.

### 3.1. Danh sách Trạm (Master Data)
- `GET /api/public/v1/stations`
- *Chi tiết:* Trả về danh sách các trạm hiện có trong hệ thống (ID public, Tên, Tọa độ, Địa chỉ, Loại trạm). Hỗ trợ filter `?type=lake|river|rain|inundation|sluice_gate|wastewater`. Bên thứ 3 dùng API này để đồng bộ danh sách ID.

### 3.2. Truy vấn dữ liệu theo từng Trạm (Query by ID)
Để đảm bảo hiệu năng và tính tường minh, việc lấy dữ liệu đo đạc (thủy văn, mưa, ngập...) sẽ được query theo từng **ID trạm** cụ thể.
Tất cả các endpoint dưới đây đều hỗ trợ Query Parameter `?date=YYYY-MM-DD`:
- Nếu **không truyền `date`**: API mặc định trả về dữ liệu **mới nhất (real-time/latest)** hiện có của trạm đó.
- Nếu **có truyền `date`**: API sẽ truy xuất và trả về dữ liệu lịch sử/báo cáo của trạm đó trong ngày tương ứng.

- **Thủy văn (Sông & Hồ)**
  - `GET /api/public/v1/water/lake/:id` (Ví dụ: `/api/public/v1/water/lake/lake_123?date=2023-10-15`)
  - `GET /api/public/v1/water/river/:id`
- **Lượng Mưa**
  - `GET /api/public/v1/rain/:id`
- **Điểm Ngập**
  - `GET /api/public/v1/inundation/:id`
  - *Chi tiết:* Trả về trạng thái ngập (Report) hiện tại/trong ngày của điểm ngập này, kèm theo mảng **History** (diễn biến chi tiết mức ngập).
- **Cửa Phai**
  - `GET /api/public/v1/sluice-gate/:id`
- **Trạm XLNT**
  - `GET /api/public/v1/wastewater/:id`

## 4. Cấu trúc dữ liệu (Data Sanitization & DTO)

Tuyệt đối không dùng các model Database trực tiếp. Tạo các struct (DTO) riêng trong `internal/dto/public_api.go` để hứng dữ liệu.
- **Loại bỏ**: `OrgID`, `ReportID`, `OldID`, `ThuTu`, các cờ logic nội bộ.
- **Chỉ cung cấp**: 
  - `id` (Mã trạm)
  - `name` (Tên trạm)
  - `address` (Địa chỉ)
  - `lat`, `lng` (Tọa độ)
  - Dữ liệu chuyên môn hiện tại (ví dụ: `current_level`, `status`, `flow_rate`...) kèm timestamp đo lường.

## 5. Các bước triển khai (Task List)

- [x] **Task 1: Setup Security & Middleware**
  - [x] Định nghĩa constant `PublicClients` trong `internal/constant/public_client.go` chứa AppID và RSA Public Key.
  - [x] Viết hàm verify RSA Signature.
  - [x] Tạo `RSAPublicAuthMiddleware` trong thư mục middleware.
  - [x] Tạo `RateLimitMiddleware` (giới hạn request trên mỗi AppID).

- [x] **Task 2: Define Data Transfer Objects (DTO)**
  - [x] Tạo file `internal/dto/public_api.go`.
  - [x] Khai báo các Struct: `PublicStationMaster`, `PublicWaterData`, `PublicRainData`, `PublicInundationData`, `PublicSluiceGateData`, `PublicWastewaterData`.

- [x] **Task 3: Service Layer (Business Logic)**
  - [x] Tạo thư mục `internal/service/publicapi` và khởi tạo file `service.go`.
  - [x] Viết hàm `GetStationsMasterList` (lọc theo type).
  - [x] Viết hàm `GetPublicWaterData` (by ID, hỗ trợ filter date).
  - [x] Viết hàm `GetPublicRainData` (by ID, hỗ trợ filter date).
  - [x] Viết hàm `GetPublicInundationData` (by ID, hỗ trợ filter date, gộp Report + History).
  - [x] Viết hàm `GetPublicSluiceGateData` (by ID, hỗ trợ filter date).
  - [x] Viết hàm `GetPublicWastewaterData` (by ID, hỗ trợ filter date).

- [x] **Task 4: Handler Layer & Routing**
  - [x] Tạo thư mục `handler/public/`.
  - [x] Viết các file handler (`api.go`) gọi trực tiếp từ `service/publicapi`.
  - [x] Tạo file `router/public.go`.
  - [x] Đăng ký group route `/api/public/v1`, apply các middleware bảo mật và mount các handler tương ứng.
  - [x] Tích hợp `router/public.go` vào file `router/router.go` chính.

- [x] **Task 5: Swagger Documentation**
  - [x] Thêm các comments Swaggo (`// @Summary`, `// @Description`, `// @Tags Public API`...) vào tất cả các public handlers.
  - [x] Định nghĩa các tham số header xác thực RSA và query `date`.
  - [x] Chạy lệnh `swag init` để sinh và cập nhật tài liệu API.

## 6. Kiến trúc Code (Architecture Separation)

Để đảm bảo tính độc lập, ổn định và **không bị ảnh hưởng** khi các API nội bộ thay đổi logic, toàn bộ code cho Public API sẽ được thiết kế **tách biệt hoàn toàn (Decoupled)** theo cấu trúc sau:

1. **Tầng Router:**
   - Tạo file riêng `router/public.go` chuyên để setup các route thuộc nhánh `/api/public/v1`.

2. **Tầng Handler:**
   - Tạo thư mục mới `handler/public/` (ví dụ: `handler/public/water.go`, `handler/public/inundation.go`).
   - Các handler này chỉ phục vụ cho request từ bên thứ 3, đọc header xác thực và trả về chuẩn JSON riêng.

3. **Tầng Service (Nơi chứa Business Logic):**
   - **Tuyệt đối KHÔNG gọi lại (reuse)** các service hiện tại như `GetWaterSummaryV2` hay `GetInundationSummary`. Vì các hàm này chứa logic phân quyền nội bộ (OrgID, Employee...) rất phức tạp và dễ thay đổi.
   - Tạo một thư mục service mới: `internal/service/publicapi/`. Service này sẽ được inject trực tiếp các **Repository** (như `stationRepo`, `waterRepo`, `inundationRepo`).
   - Logic trong `service/publicapi` sẽ cực kỳ đơn giản: Query thẳng xuống DB qua Repository -> Map kết quả vào các struct `PublicDTO` -> Trả về cho Handler.

4. **Tầng DTO (Data Transfer Object):**
   - Đặt tại `internal/dto/public_api.go`. File này chỉ định nghĩa các struct kết quả trả ra ngoài (đã được lọc sạch các trường nội bộ nhạy cảm).
