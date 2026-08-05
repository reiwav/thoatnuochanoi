# Hướng dẫn Tích hợp API Public

Tài liệu này cung cấp hướng dẫn chi tiết về cách kết nối, xác thực và sử dụng các API Public của Hệ thống Thoát nước Hà Nội

---

## 1. Thông tin chung

- **Môi trường**: 
  - Staging: `https://hsdc.reiway.vn`
  - Production: `https://api.thoatnuochanoi.vn`
- **Prefix URL**: `/api/public/v1`
- **Giao thức**: HTTPS
- **Định dạng dữ liệu**: JSON

---

## 2. Cơ chế Xác thực (Authentication)

Hệ thống sử dụng cơ chế chữ ký điện tử **RSA (RS256)** để đảm bảo tính toàn vẹn và xác thực của request.

### 2.1. Cấu trúc Headers yêu cầu
Tất cả các API gửi lên cần bắt buộc có 3 headers sau:

| Header | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `X-App-Id` | string | Có | Mã định danh đối tác do hệ thống cung cấp. Với IOC HaNoi, giá trị là: `ioc_app` |
| `X-Timestamp` | string (int64) | Có | Thời gian gọi API (Unix timestamp tính bằng giây). Giới hạn sai lệch tối đa 5 phút để chống Replay Attack. Ví dụ: `1700000000` |
| `X-Signature` | string | Có | Chữ ký điện tử mã hóa Base64 do phía client tạo ra dựa trên Private Key. |

### 2.2. Hướng dẫn tạo chữ ký (X-Signature)

Để tạo được chữ ký hợp lệ, đối tác thực hiện theo các bước sau:

**Bước 1: Chuẩn bị chuỗi dữ liệu (Payload) cần ký**
Chuỗi dữ liệu được ghép nối theo định dạng: `[X-App-Id][X-Timestamp][Path]`
*(Lưu ý: Path không bao gồm domain và query parameters)*

Ví dụ:
- `X-App-Id` = `ioc_app`
- `X-Timestamp` = `1700000000`
- API URL = `https://api.thoatnuochanoi.vn/api/public/v1/water/lake/lake_123?date=2023-10-15`
- Path = `/api/public/v1/water/lake/lake_123`
=> **Chuỗi Payload cần ký**: `ioc_app1700000000/api/public/v1/water/lake/lake_123`

**Bước 2: Ký Payload bằng Private Key**
- Sử dụng thuật toán **SHA256 with RSA** (RS256).
- Dùng Private Key của đối tác để ký lên chuỗi Payload ở Bước 1.

**Bước 3: Mã hóa Base64**
- Mã hóa kết quả byte của chữ ký ở Bước 2 sang chuỗi Base64.
- Gắn chuỗi Base64 này vào header `X-Signature`.

---

## 3. Hướng dẫn tạo Cặp khóa RSA (Public/Private Key)

IOC cần tạo một cặp khóa RSA (2048 bit). **Private Key** đối tác giữ lại để tạo chữ ký (`X-Signature`), **Public Key** gửi cho Hệ thống Thoát nước Hà Nội để cấu hình cấp quyền truy cập.

### Cú pháp tạo bằng OpenSSL trên Terminal/Command Line

**Tạo Private Key (private_key.pem):**
```bash
openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
```

**Tạo Public Key (public_key.pem) từ Private Key:**
```bash
openssl rsa -pubout -in private_key.pem -out public_key.pem
```

*Lưu ý: Bạn copy toàn bộ nội dung file `public_key.pem` (bao gồm cả dòng `-----BEGIN PUBLIC KEY-----` và `-----END PUBLIC KEY-----`) gửi cho bộ phận hỗ trợ kỹ thuật của hệ thống để được đăng ký.*

---

## 4. Danh sách API

Tất cả các API khi gọi cần truyền đầy đủ bộ 3 headers xác thực ở phần 2.

### 4.1. Lấy danh sách Trạm (Master Data)

API cung cấp danh sách thông tin cơ bản của các trạm để bên thứ 3 có thể lấy `id` map với các endpoint chi tiết.

- **Endpoint**: `GET /api/public/v1/stations`
- **Query Parameters**:
  - `type` (optional): Loại trạm (lake, river, rain, inundation, sluice_gate, wastewater). Nếu bỏ trống sẽ lấy tất cả.

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "id": "lake_123",
      "name": "Hồ Gươm",
      "type": "lake",
      "address": "Quận Hoàn Kiếm, Hà Nội",
      "lat": 21.028511,
      "lng": 105.854165
    },
    {
      "id": "rain_01",
      "name": "Trạm Mưa Láng",
      "type": "rain",
      "address": "Đường Láng, Đống Đa, Hà Nội",
      "lat": 21.018274,
      "lng": 105.801646
    }
  ]
}
```

### 4.2. Lấy dữ liệu Thủy văn Sông/Hồ theo Trạm

Lấy dữ liệu mực nước hiện tại hoặc lịch sử theo ngày của 1 trạm.

- **Endpoint (Hồ)**: `GET /api/public/v1/water/lake/:id`
- **Endpoint (Sông)**: `GET /api/public/v1/water/river/:id`
- **Query Parameters**:
  - `date` (optional): Định dạng `YYYY-MM-DD`. Nếu truyền vào, sẽ trả về dữ liệu của ngày đó. Nếu không truyền, trả về dữ liệu mới nhất (real-time).

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": "lake_123",
    "name": "Hồ Gươm",
    "address": "Quận Hoàn Kiếm, Hà Nội",
    "lat": 21.028511,
    "lng": 105.854165,
    "current_level": 4.5,
    "status": "normal",
    "measured_at": "2023-10-15T08:30:00Z"
  }
}
```

### 4.3. Lấy dữ liệu Điểm Ngập

Lấy tình trạng ngập hiện hành hoặc báo cáo ngập trong ngày của một điểm ngập cụ thể.

- **Endpoint**: `GET /api/public/v1/inundation/:id`
- **Query Parameters**:
  - `date` (optional): Định dạng `YYYY-MM-DD`. Trả về dữ liệu lịch sử ngập của ngày. Nếu không truyền sẽ lấy dữ liệu hiện tại.

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "status": "flooded",
    "current_depth": 0.45,
    "max_depth": 0.50,
    "start_time": "2023-10-15T07:00:00Z",
    "end_time": "",
    "length": "50m",
    "width": "10m",
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ],
    "history": [
      {
        "time": "2023-10-15T08:00:00Z",
        "depth": 0.45,
        "length": "50m",
        "width": "10m",
        "images": [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg"
        ],
        "note": "Ngập sâu"
      },
      {
        "time": "2023-10-15T07:00:00Z",
        "depth": 0.15,
        "length": "20m",
        "width": "5m",
        "images": [
          "https://example.com/image_early.jpg"
        ],
        "note": "Bắt đầu ngập"
      }
    ]
  }
}
```

### 4.4. Lấy dữ liệu Trạm Mưa

- **Endpoint**: `GET /api/public/v1/rain/:id`
- **Query Parameters**: `date` (optional)

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": "rain_01",
    "name": "Trạm Mưa Láng",
    "address": "Đường Láng, Đống Đa, Hà Nội",
    "lat": 21.018274,
    "lng": 105.801646,
    "rainfall_1h": 25.4,
    "rainfall_3h": 40.2,
    "rainfall_24h": 85.0,
    "measured_at": "2023-10-15T08:30:00Z"
  }
}
```

### 4.5. Lấy dữ liệu Cửa Phai (Sluice Gate) & Trạm XLNT (Wastewater)

- **Cửa Phai**: `GET /api/public/v1/sluice-gate/:id`
- **Trạm XLNT**: `GET /api/public/v1/wastewater/:id`

Cấu trúc trả về tương tự các Endpoint trên, bao gồm các thuộc tính riêng biệt (như trạng thái đóng/mở cửa phai, lưu lượng nước thải) và thời gian đo (`measured_at`).

---

## 5. Các Mã Lỗi (Error Codes) Thường Gặp

Trong trường hợp thất bại, API sẽ trả về cấu trúc lỗi chung:

```json
{
  "code": 401,
  "message": "Unauthorized: Invalid Signature"
}
```

- **401 Unauthorized**: Lỗi xác thực (Thiếu header, Sai X-App-Id, Timestamp quá hạn hoặc Chữ ký không hợp lệ).
- **429 Too Many Requests**: Client gọi vượt mức Rate Limit cho phép.
- **400 Bad Request**: Sai định dạng tham số (Ví dụ: `date` không đúng định dạng YYYY-MM-DD).
- **404 Not Found**: Mã trạm (`id`) không tồn tại trong hệ thống.
- **500 Internal Server Error**: Lỗi máy chủ từ phía hệ thống.
