# Hướng dẫn Tích hợp API Public

Tài liệu này cung cấp hướng dẫn chi tiết về cách kết nối, xác thực và sử dụng các API Public của Hệ thống Thoát nước Hà Nội

---

## 1. Thông tin chung

- **Môi trường**: 
  - Production: `https://api-htbc.thoatnuochanoi.vn`
  - Staging / Dev: `https://hsdc.reiway.vn`
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
| `X-App-Id` | string | Có | Mã định danh đối tác do hệ thống cấp (Ví dụ với IOC: `hsdc-api-2026`) |
| `X-Timestamp` | string (int64) | Có | Thời gian gọi API (Unix timestamp tính bằng giây). Giới hạn sai lệch tối đa 5 phút để chống Replay Attack. Ví dụ: `1700000000` |
| `X-Signature` | string | Có | Chữ ký điện tử mã hóa Base64 do phía client tạo ra dựa trên Private Key. |

### 2.2. Hướng dẫn tạo chữ ký (X-Signature)

Để tạo được chữ ký hợp lệ, đối tác thực hiện theo các bước sau:

**Bước 1: Chuẩn bị chuỗi dữ liệu (Payload) cần ký**
Chuỗi dữ liệu được ghép nối theo định dạng: `[X-App-Id][X-Timestamp][Path]`
*(Lưu ý: Path không bao gồm domain và query parameters)*

Ví dụ:
- `X-App-Id` = `hsdc-api-2026`
- `X-Timestamp` = `1700000000`
- API URL = `https://api-htbc.thoatnuochanoi.vn/api/public/v1/water/lake/lake_123?date=1700000000`
- Path = `/api/public/v1/water/lake/lake_123`
=> **Chuỗi Payload cần ký**: `hsdc-api-20261700000000/api/public/v1/water/lake/lake_123`

**Bước 2: Ký Payload bằng Private Key**
- Sử dụng thuật toán **SHA256 with RSA** (RS256 - PKCS#1 v1.5).
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
  - `type` (optional): Loại trạm (`lake`, `river`, `rain`, `inundation`, `sluice_gate`, `wastewater`). Nếu bỏ trống sẽ lấy tất cả.

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "id": "gate_damchuoi",
      "name": "Cửa phai Cống Đầm Chuối",
      "type": "sluice_gate",
      "address": "Phường Khương Đình, Quận Thanh Xuân, Hà Nội"
    },
    {
      "id": "lake_hoankiem",
      "name": "Hồ Hoàn Kiếm",
      "type": "lake",
      "address": "Quận Hoàn Kiếm, Hà Nội",
      "lat": "21.028511",
      "lng": "105.854165"
    },
    {
      "id": "rain_lang",
      "name": "Trạm Đo Mưa Láng",
      "type": "rain",
      "address": "Đường Láng, Quận Đống Đa, Hà Nội",
      "lat": "21.018274",
      "lng": "105.801646"
    },
    {
      "id": "inu_nguyenkhuyen",
      "name": "Điểm ngập Phố Nguyễn Khuyến (Trường Lý Thường Kiệt)",
      "type": "inundation",
      "address": "Phố Nguyễn Khuyến, Quận Đống Đa, Hà Nội",
      "lat": "21.027123",
      "lng": "105.839456"
    },
    {
      "id": "ww_baymau",
      "name": "Trạm Xử lý Nước thải Bảy Mẫu",
      "type": "wastewater",
      "address": "Công viên Thống Nhất, Quận Hai Bà Trưng, Hà Nội"
    }
  ]
}
```

### 4.2. Lấy dữ liệu Thủy văn Sông/Hồ theo Trạm

Lấy dữ liệu mực nước hiện tại hoặc lịch sử theo ngày của 1 trạm.

- **Endpoint (Hồ)**: `GET /api/public/v1/water/lake/:id`
- **Endpoint (Sông)**: `GET /api/public/v1/water/river/:id`
- **Query Parameters**:
  - `date` (optional): Định dạng Unix timestamp (giây). Nếu truyền vào, sẽ trả về dữ liệu tại thời điểm đó. Nếu không truyền, trả về dữ liệu mới nhất (real-time).

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "current_level": 5.42,
      "status": "safe",
      "timestamp": "2026-08-19T08:30:00Z"
    }
  ]
}
```

### 4.3. Lấy dữ liệu Điểm Ngập

Lấy tình trạng ngập hiện hành hoặc báo cáo ngập trong ngày của một điểm ngập cụ thể.

- **Endpoint**: `GET /api/public/v1/inundation/:id`
- **Query Parameters**:
  - `start_date` (optional): Định dạng Unix timestamp (giây). Thời gian bắt đầu lấy dữ liệu (tối đa 1 năm).
  - `end_date` (optional): Định dạng Unix timestamp (giây). Thời gian kết thúc. Nếu không truyền sẽ lấy dữ liệu hiện tại.

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "status": "flooded",
      "current_depth": 0.35,
      "max_depth": 0.45,
      "start_time": "2026-08-19T07:15:00Z",
      "end_time": "",
      "length": "80m",
      "width": "12m",
      "images": [
        "https://lh3.googleusercontent.com/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ=s1000",
        "https://api-htbc.thoatnuochanoi.vn/api/storage/file/inundation/2026/08/img_01.jpg"
      ],
      "history": [
        {
          "time": "2026-08-19T08:30:00Z",
          "depth": 0.35,
          "length": "80m",
          "width": "12m",
          "images": [
            "https://lh3.googleusercontent.com/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ=s1000"
          ],
          "note": "Nước đang rút dần"
        },
        {
          "time": "2026-08-19T07:45:00Z",
          "depth": 0.45,
          "length": "100m",
          "width": "15m",
          "images": [
            "https://api-htbc.thoatnuochanoi.vn/api/storage/file/inundation/2026/08/img_peak.jpg"
          ],
          "note": "Ngập sâu nhất, phương tiện khó di chuyển"
        }
      ]
    }
  ]
}
```

> [!NOTE]
> **Quy chuẩn Định dạng Link Ảnh (`images`)**:
> - **Ảnh lưu trữ trên Google Drive**: Hệ thống cung cấp link CDN tốc độ cao `https://lh3.googleusercontent.com/d/{file_id}=s1000` (hoặc `https://drive.google.com/uc?id={file_id}`).
> - **Ảnh lưu trữ Local Server**: Hệ thống cung cấp đường dẫn `/api/storage/file/{path}` (đối tác ghép với `BaseUrl` để hiển thị: `https://api-htbc.thoatnuochanoi.vn/api/storage/file/{path}`).
> - **Ảnh link ngoài / CDN khác**: Giữ nguyên link `http://` hoặc `https://`.

### 4.4. Lấy dữ liệu Trạm Mưa

- **Endpoint**: `GET /api/public/v1/rain/:id`
- **Query Parameters**: `date` (optional) - Định dạng Unix timestamp (giây). Nếu không truyền sẽ trả về dữ liệu mới nhất.

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "rain_1h": 32.5,
      "rain_3h": 68.0,
      "rain_24h": 115.4,
      "timestamp": "2026-08-19T08:30:00Z"
    }
  ]
}
```

### 4.5. Lấy dữ liệu Vận hành Cửa Phai (Sluice Gate)

API cung cấp dữ liệu lịch sử và trạng thái vận hành đóng/mở thực tế của các cửa phai nhằm phục vụ công tác giám sát, điều tiết thoát nước và phòng chống ngập úng trên địa bàn thành phố Hà Nội.

- **Endpoint**: `GET /api/public/v1/sluice-gate/:id`
- **Query Parameters**:
  - `date` (optional): Định dạng Unix timestamp tính bằng giây (ví dụ: `1700000000`). Nếu không truyền, hệ thống trả về thông tin vận hành trong ngày hiện tại.

**Mô tả các trường dữ liệu:**

| Trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `is_open` | boolean | Trạng thái cửa phai: `true` (Đang mở để xả/lấy nước), `false` (Đang đóng). |
| `open_level` | float | Mức độ mở của cửa phai (tính theo tỷ lệ % hoặc mm tùy theo cấu hình loại cửa). |
| `timestamp` | string (ISO 8601) | Thời điểm ghi nhận thao tác vận hành hoặc trạng thái cảm biến. |

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "is_open": true,
      "open_level": 100.0,
      "timestamp": "2023-10-15T08:30:00Z"
    },
    {
      "is_open": false,
      "open_level": 0.0,
      "timestamp": "2023-10-15T06:00:00Z"
    }
  ]
}
```

### 4.6. Lấy dữ liệu Trạm Xử lý Nước thải (Wastewater)

- **Endpoint**: `GET /api/public/v1/wastewater/:id`
- **Query Parameters**: `date` (optional) - Định dạng Unix timestamp (giây). Nếu không truyền sẽ trả về dữ liệu mới nhất.

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "flow_rate": 120.5,
      "quality_metrics": "Đạt chuẩn",
      "timestamp": "2023-10-15T08:30:00Z"
    }
  ]
}
```

---

## 5. Các Mã Lỗi (Error Codes) Thường Gặp

Trong trường hợp thất bại, API sẽ trả về cấu trúc lỗi chung:

```json
{
  "code": 401,
  "message": "Unauthorized: Chữ ký không hợp lệ"
}
```

- **401 Unauthorized**: Lỗi xác thực (Thiếu header, Sai `X-App-Id`, `X-Timestamp` quá hạn lệch quá 5 phút, hoặc `X-Signature` không hợp lệ).
- **429 Too Many Requests**: Client gọi vượt mức Rate Limit cho phép (mặc định 100 req/phút/AppID).
- **400 Bad Request**: Sai định dạng tham số.
- **404 Not Found**: Mã trạm (`id`) không tồn tại trong hệ thống.
- **500 Internal Server Error**: Lỗi máy chủ từ phía hệ thống.

---

## 6. Hướng dẫn Tích hợp & Code Mẫu bằng C# (.NET 6 / .NET 8+)

Dưới đây là mã nguồn C# mẫu hoàn chỉnh, chuẩn hóa cho phía IOC Thành phố sử dụng để tích hợp, tự động tạo chữ ký RSA (RS256) và gọi các Public API.

### 6.1. Cài đặt các thư viện cần thiết

Ứng dụng C# sử dụng thư viện chuẩn của .NET (`System.Security.Cryptography`, `System.Text.Json`, `System.Net.Http`), không cần cài thêm thư viện bên ngoài nếu dùng .NET 6/7/8/9.

Nếu sử dụng .NET Framework cũ hoặc .NET Standard 2.0, có thể cần cài thêm package:
```bash
dotnet add package System.Text.Json
dotnet add package BouncyCastle.Cryptography # (Nếu .NET runtime cũ chưa hỗ trợ ImportFromPem)
```

---

### 6.2. Định nghĩa các Data Transfer Object (DTO) trong C#

Tạo file `TnhnModels.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace IocCityIntegration.Models
{
    /// <summary>
    /// Cấu trúc phản hồi chung từ API
    /// </summary>
    public class ApiResponse<T>
    {
        [JsonPropertyName("code")]
        public int Code { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public T? Data { get; set; }
    }

    /// <summary>
    /// Thông tin danh mục Trạm (Master Data)
    /// </summary>
    public class StationMasterDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("address")]
        public string Address { get; set; } = string.Empty;

        [JsonPropertyName("lat")]
        public string? Lat { get; set; }

        [JsonPropertyName("lng")]
        public string? Lng { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty; // lake, river, rain, inundation, sluice_gate, wastewater
    }

    /// <summary>
    /// Dữ liệu vận hành Cửa Phai
    /// </summary>
    public class SluiceGateDataDto
    {
        [JsonPropertyName("is_open")]
        public bool IsOpen { get; set; }

        [JsonPropertyName("open_level")]
        public double OpenLevel { get; set; }

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; }
    }

    /// <summary>
    /// Dữ liệu Mực nước Sông / Hồ
    /// </summary>
    public class WaterDataDto
    {
        [JsonPropertyName("current_level")]
        public double CurrentLevel { get; set; }

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>
    /// Dữ liệu Trạm Mưa
    /// </summary>
    public class RainDataDto
    {
        [JsonPropertyName("rain_1h")]
        public double Rain1H { get; set; }

        [JsonPropertyName("rain_3h")]
        public double Rain3H { get; set; }

        [JsonPropertyName("rain_24h")]
        public double Rain24H { get; set; }

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; }
    }

    /// <summary>
    /// Lịch sử diễn biến điểm ngập
    /// </summary>
    public class InundationHistoryItemDto
    {
        [JsonPropertyName("time")]
        public string Time { get; set; } = string.Empty;

        [JsonPropertyName("depth")]
        public double Depth { get; set; }

        [JsonPropertyName("length")]
        public string Length { get; set; } = string.Empty;

        [JsonPropertyName("width")]
        public string Width { get; set; } = string.Empty;

        [JsonPropertyName("images")]
        public List<string> Images { get; set; } = new();

        [JsonPropertyName("note")]
        public string Note { get; set; } = string.Empty;
    }

    /// <summary>
    /// Dữ liệu Báo cáo Điểm Ngập
    /// </summary>
    public class InundationDataDto
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty; // flooded, normal

        [JsonPropertyName("current_depth")]
        public double CurrentDepth { get; set; }

        [JsonPropertyName("max_depth")]
        public double MaxDepth { get; set; }

        [JsonPropertyName("start_time")]
        public string StartTime { get; set; } = string.Empty;

        [JsonPropertyName("end_time")]
        public string EndTime { get; set; } = string.Empty;

        [JsonPropertyName("length")]
        public string Length { get; set; } = string.Empty;

        [JsonPropertyName("width")]
        public string Width { get; set; } = string.Empty;

        [JsonPropertyName("images")]
        public List<string> Images { get; set; } = new();

        [JsonPropertyName("history")]
        public List<InundationHistoryItemDto> History { get; set; } = new();
    }

    /// <summary>
    /// Dữ liệu Trạm Xử lý Nước thải
    /// </summary>
    public class WastewaterDataDto
    {
        [JsonPropertyName("flow_rate")]
        public double FlowRate { get; set; }

        [JsonPropertyName("quality_metrics")]
        public string QualityMetrics { get; set; } = string.Empty;

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; }
    }
}
```

---

### 6.3. Xây dựng Lớp Tích hợp `TnhnApiClient` trong C#

Tạo file `TnhnApiClient.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using IocCityIntegration.Models;

namespace IocCityIntegration.Services
{
    public class TnhnApiClient : IDisposable
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private readonly string _appId;
        private readonly RSA _rsaPrivateKey;

        /// <summary>
        /// Khởi tạo API Client
        /// </summary>
        /// <param name="baseUrl">Base URL hệ thống (vd: https://api-htbc.thoatnuochanoi.vn hoặc https://hsdc.reiway.vn)</param>
        /// <param name="appId">Mã định danh AppId được cấp (vd: hsdc-api-2026)</param>
        /// <param name="privateKeyPem">Nội dung file Private Key (PEM format)</param>
        /// <param name="httpClient">HttpClient (tuỳ chọn)</param>
        public TnhnApiClient(string baseUrl, string appId, string privateKeyPem, HttpClient? httpClient = null)
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _appId = appId ?? throw new ArgumentNullException(nameof(appId));
            _httpClient = httpClient ?? new HttpClient();

            _rsaPrivateKey = RSA.Create();
            LoadPrivateKeyPem(privateKeyPem);
        }

        /// <summary>
        /// Đọc Private Key định dạng PEM (PKCS#1 hoặc PKCS#8)
        /// </summary>
        private void LoadPrivateKeyPem(string pemContent)
        {
            // .NET 5.0+ hỗ trợ trực tiếp hàm ImportFromPem
            _rsaPrivateKey.ImportFromPem(pemContent.ToCharArray());
        }

        /// <summary>
        /// Tạo HttpRequestMessage có gắn đầy đủ bộ 3 Headers xác thực RSA: X-App-Id, X-Timestamp, X-Signature
        /// </summary>
        private HttpRequestMessage CreateAuthenticatedRequest(HttpMethod method, string path, Dictionary<string, string>? queryParams = null)
        {
            // 1. Lấy Timestamp hiện tại (Unix timestamp tính bằng giây)
            long timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            string timestampStr = timestamp.ToString();

            // 2. Chuỗi Payload cần ký theo quy tắc: [X-App-Id][X-Timestamp][Path]
            // Lưu ý: Path không bao gồm domain và query parameters
            string payload = $"{_appId}{timestampStr}{path}";

            // 3. Ký dữ liệu bằng RSA với thuật toán SHA256 (RS256 - PKCS#1 v1.5)
            byte[] payloadBytes = Encoding.UTF8.GetBytes(payload);
            byte[] signatureBytes = _rsaPrivateKey.SignData(payloadBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

            // 4. Mã hóa Base64
            string signatureBase64 = Convert.ToBase64String(signatureBytes);

            // 5. Xây dựng URL đầy đủ bao gồm Query String (nếu có)
            string fullUrl = $"{_baseUrl}{path}";
            if (queryParams != null && queryParams.Count > 0)
            {
                string queryString = string.Join("&", queryParams.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
                fullUrl += $"?{queryString}";
            }

            var request = new HttpRequestMessage(method, fullUrl);
            request.Headers.Add("X-App-Id", _appId);
            request.Headers.Add("X-Timestamp", timestampStr);
            request.Headers.Add("X-Signature", signatureBase64);

            return request;
        }

        /// <summary>
        /// Thực thi request và parse kết quả JSON
        /// </summary>
        private async Task<T?> SendAsync<T>(HttpMethod method, string path, Dictionary<string, string>? queryParams = null)
        {
            using var request = CreateAuthenticatedRequest(method, path, queryParams);
            using var response = await _httpClient.SendAsync(request);

            string responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"API Error ({response.StatusCode}): {responseBody}");
            }

            var result = JsonSerializer.Deserialize<ApiResponse<T>>(responseBody, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return result != null ? result.Data : default;
        }

        #region Các phương thức Public API

        /// <summary>
        /// 1. Lấy danh sách trạm (Master Data)
        /// </summary>
        /// <param name="type">Loại trạm: lake, river, rain, inundation, sluice_gate, wastewater (hoặc null để lấy tất cả)</param>
        public async Task<List<StationMasterDto>?> GetMasterStationsAsync(string? type = null)
        {
            var query = new Dictionary<string, string>();
            if (!string.IsNullOrEmpty(type))
            {
                query["type"] = type;
            }
            return await SendAsync<List<StationMasterDto>>(HttpMethod.Get, "/api/public/v1/stations", query);
        }

        /// <summary>
        /// 2. Lấy dữ liệu vận hành Cửa Phai theo ID
        /// </summary>
        /// <param name="stationId">ID trạm cửa phai</param>
        /// <param name="dateUnix">Unix timestamp (giây), để trống để lấy dữ liệu ngày hiện tại</param>
        public async Task<List<SluiceGateDataDto>?> GetSluiceGateDataAsync(string stationId, long? dateUnix = null)
        {
            var query = new Dictionary<string, string>();
            if (dateUnix.HasValue)
            {
                query["date"] = dateUnix.Value.ToString();
            }
            return await SendAsync<List<SluiceGateDataDto>>(HttpMethod.Get, $"/api/public/v1/sluice-gate/{stationId}", query);
        }

        /// <summary>
        /// 3. Lấy dữ liệu Mực nước Hồ theo ID
        /// </summary>
        public async Task<List<WaterDataDto>?> GetLakeWaterDataAsync(string stationId, long? dateUnix = null)
        {
            var query = new Dictionary<string, string>();
            if (dateUnix.HasValue)
            {
                query["date"] = dateUnix.Value.ToString();
            }
            return await SendAsync<List<WaterDataDto>>(HttpMethod.Get, $"/api/public/v1/water/lake/{stationId}", query);
        }

        /// <summary>
        /// 4. Lấy dữ liệu Mực nước Sông theo ID
        /// </summary>
        public async Task<List<WaterDataDto>?> GetRiverWaterDataAsync(string stationId, long? dateUnix = null)
        {
            var query = new Dictionary<string, string>();
            if (dateUnix.HasValue)
            {
                query["date"] = dateUnix.Value.ToString();
            }
            return await SendAsync<List<WaterDataDto>>(HttpMethod.Get, $"/api/public/v1/water/river/{stationId}", query);
        }

        /// <summary>
        /// 5. Lấy dữ liệu Lượng mưa theo ID
        /// </summary>
        public async Task<List<RainDataDto>?> GetRainDataAsync(string stationId, long? dateUnix = null)
        {
            var query = new Dictionary<string, string>();
            if (dateUnix.HasValue)
            {
                query["date"] = dateUnix.Value.ToString();
            }
            return await SendAsync<List<RainDataDto>>(HttpMethod.Get, $"/api/public/v1/rain/{stationId}", query);
        }

        /// <summary>
        /// 6. Lấy dữ liệu Điểm Ngập theo ID
        /// </summary>
        /// <param name="stationId">ID điểm ngập</param>
        /// <param name="startDateUnix">Thời điểm bắt đầu (giây)</param>
        /// <param name="endDateUnix">Thời điểm kết thúc (giây)</param>
        public async Task<List<InundationDataDto>?> GetInundationDataAsync(string stationId, long? startDateUnix = null, long? endDateUnix = null)
        {
            var query = new Dictionary<string, string>();
            if (startDateUnix.HasValue) query["start_date"] = startDateUnix.Value.ToString();
            if (endDateUnix.HasValue) query["end_date"] = endDateUnix.Value.ToString();

            return await SendAsync<List<InundationDataDto>>(HttpMethod.Get, $"/api/public/v1/inundation/{stationId}", query);
        }

        /// <summary>
        /// 7. Lấy dữ liệu Trạm Xử lý Nước thải theo ID
        /// </summary>
        public async Task<List<WastewaterDataDto>?> GetWastewaterDataAsync(string stationId, long? dateUnix = null)
        {
            var query = new Dictionary<string, string>();
            if (dateUnix.HasValue) query["date"] = dateUnix.Value.ToString();

            return await SendAsync<List<WastewaterDataDto>>(HttpMethod.Get, $"/api/public/v1/wastewater/{stationId}", query);
        }

        /// <summary>
        /// 8. Hàm tiện ích chuyển đổi Link Ảnh (Google Drive / Local Storage) thành URL đầy đủ
        /// </summary>
        public string ResolveImageUrl(string? rawImage)
        {
            if (string.IsNullOrWhiteSpace(rawImage)) return string.Empty;

            // Nếu đã là link đầy đủ http/https
            if (rawImage.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || 
                rawImage.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return rawImage;
            }

            // Nếu là ảnh local storage (/api/storage/file/... hoặc local:...)
            if (rawImage.StartsWith("local:", StringComparison.OrdinalIgnoreCase))
            {
                string path = rawImage.Substring("local:".Length).TrimStart('/');
                return $"{_baseUrl}/api/storage/file/{path}";
            }
            if (rawImage.StartsWith("/api/storage/file/", StringComparison.OrdinalIgnoreCase) || 
                rawImage.StartsWith("/storage/", StringComparison.OrdinalIgnoreCase))
            {
                return $"{_baseUrl}{rawImage}";
            }

            // Mặc định là Google Drive File ID -> xuất link CDN tối ưu
            return $"https://lh3.googleusercontent.com/d/{rawImage}=s1000";
        }

        #endregion

        public void Dispose()
        {
            _rsaPrivateKey?.Dispose();
            _httpClient?.Dispose();
        }
    }
}
```

---

### 6.4. Code Mẫu Chương trình Thực thi (`Program.cs`)

Tạo file `Program.cs` để kiểm thử kết nối và gọi lấy dữ liệu:

```csharp
using System;
using System.IO;
using System.Threading.Tasks;
using IocCityIntegration.Services;

namespace IocCityIntegration
{
    internal class Program
    {
        static async Task Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;
            Console.WriteLine("=================================================");
            Console.WriteLine(" KẾT NỐI HỆ THỐNG THOÁT NƯỚC HÀ NỘI - IOC CITY ");
            Console.WriteLine("=================================================\n");

            // 1. Cấu hình thông tin kết nối
            string baseUrl = "https://api-htbc.thoatnuochanoi.vn"; // Production (hoặc https://hsdc.reiway.vn)
            string appId = "hsdc-api-2026"; // Mã App ID được cấp

            // Đọc Private Key từ file private_key.pem (do phía IOC sinh ra)
            string privateKeyPath = "private_key.pem";
            if (!File.Exists(privateKeyPath))
            {
                Console.WriteLine($"[LỖI] Không tìm thấy file Private Key tại: {Path.GetFullPath(privateKeyPath)}");
                Console.WriteLine("Vui lòng sinh khóa RSA theo hướng dẫn ở Mục 3.");
                return;
            }

            string privateKeyPem = await File.ReadAllTextAsync(privateKeyPath);

            // 2. Khởi tạo Client
            using var client = new TnhnApiClient(baseUrl, appId, privateKeyPem);

            try
            {
                // ==========================================
                // TEST 1: Lấy danh sách các Cửa Phai (Master Data)
                // ==========================================
                Console.WriteLine("1. Đang lấy danh sách các Trạm Cửa Phai...");
                var sluiceGates = await client.GetMasterStationsAsync(type: "sluice_gate");

                if (sluiceGates != null && sluiceGates.Count > 0)
                {
                    Console.WriteLine($"-> Tìm thấy {sluiceGates.Count} cửa phai:");
                    foreach (var gate in sluiceGates)
                    {
                        Console.WriteLine($"   - [ID: {gate.Id}] {gate.Name} (Địa chỉ: {gate.Address})");
                    }

                    // ==========================================
                    // TEST 2: Lấy dữ liệu Vận hành Cửa Phai đầu tiên
                    // ==========================================
                    string firstGateId = sluiceGates[0].Id;
                    Console.WriteLine($"\n2. Đang lấy dữ liệu vận hành của cửa phai: {sluiceGates[0].Name} (ID: {firstGateId})...");

                    var opHistory = await client.GetSluiceGateDataAsync(firstGateId);
                    if (opHistory != null && opHistory.Count > 0)
                    {
                        Console.WriteLine($"-> Có {opHistory.Count} bản ghi vận hành:");
                        foreach (var record in opHistory)
                        {
                            string status = record.IsOpen ? "ĐANG MỞ" : "ĐANG ĐÓNG";
                            Console.WriteLine($"   + Thời điểm: {record.Timestamp:dd/MM/yyyy HH:mm:ss} | Trạng thái: {status} | Độ mở: {record.OpenLevel}%");
                        }
                    }
                    else
                    {
                        Console.WriteLine("-> Chưa có bản ghi vận hành nào trong ngày.");
                    }
                }
                else
                {
                    Console.WriteLine("-> Không có trạm cửa phai nào được trả về.");
                }

                // ==========================================
                // TEST 3: Lấy danh sách Điểm Ngập & Trạng thái ngập
                // ==========================================
                Console.WriteLine("\n3. Đang lấy danh sách các Điểm Ngập...");
                var inundationPoints = await client.GetMasterStationsAsync(type: "inundation");
                if (inundationPoints != null && inundationPoints.Count > 0)
                {
                    Console.WriteLine($"-> Tìm thấy {inundationPoints.Count} điểm ngập:");
                    var sampleInu = inundationPoints[0];
                    Console.WriteLine($"   - Kiểm tra điểm: {sampleInu.Name} [ID: {sampleInu.Id}]");

                    var inuData = await client.GetInundationDataAsync(sampleInu.Id);
                    if (inuData != null && inuData.Count > 0)
                    {
                        var report = inuData[0];
                        Console.WriteLine($"     + Trạng thái: {report.Status} | Độ sâu hiện tại: {report.CurrentDepth}m | Độ sâu cực đại: {report.MaxDepth}m");
                    }
                }

                // ==========================================
                // TEST 4: Lấy dữ liệu Trạm Mưa
                // ==========================================
                Console.WriteLine("\n4. Đang lấy danh sách Trạm Mưa...");
                var rainStations = await client.GetMasterStationsAsync(type: "rain");
                if (rainStations != null && rainStations.Count > 0)
                {
                    var sampleRain = rainStations[0];
                    var rainData = await client.GetRainDataAsync(sampleRain.Id);
                    if (rainData != null && rainData.Count > 0)
                    {
                        var latestRain = rainData[0];
                        Console.WriteLine($"   - {sampleRain.Name}: Mưa 1h = {latestRain.Rain1H}mm | Mưa 3h = {latestRain.Rain3H}mm | Mưa 24h = {latestRain.Rain24H}mm");
                    }
                }

                Console.WriteLine("\n=================================================");
                Console.WriteLine(" GỌI API THÀNH CÔNG HOÀN TẤT! ");
                Console.WriteLine("=================================================");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n[LỖI TRONG QUÁ TRÌNH GỌI API]: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Chi tiết: {ex.InnerException.Message}");
                }
            }

            Console.WriteLine("\nNhấn phím bất kỳ để thoát...");
            Console.ReadKey();
        }
    }
}
```

---

### 6.5. Lưu ý quan trọng khi triển khai trên hệ thống thực tế (Production)

1. **Đồng bộ thời gian máy chủ (NTP Synchronization)**:
   - Header `X-Timestamp` được hệ thống xác thực trong khoảng dung sai **±5 phút**. Máy chủ chạy ứng dụng của IOC cần được đồng bộ giờ qua máy chủ thời gian chuẩn (NTP) để tránh lỗi `401 Unauthorized (Request quá hạn)`.
2. **Quản lý Vòng đời `HttpClient` & RSA**:
   - Trong ứng dụng Web / Worker Service (ASP.NET Core), nên đăng ký `TnhnApiClient` dạng **Singleton** hoặc thông qua `IHttpClientFactory` (`services.AddHttpClient<TnhnApiClient>()`) để tối ưu việc tái sử dụng connection pool và giảm tải CPU khi khởi tạo RSA object.
3. **Cơ chế Cache Danh mục Trạm (Master Data)**:
   - Dữ liệu danh mục trạm (`/api/public/v1/stations`) ít khi thay đổi. Khuyến nghị phía IOC lưu cache định kỳ (ví dụ: 12 - 24 giờ một lần) thay vì gọi API danh mục trạm liên tục mỗi phút.
4. **Xử lý Giới hạn Tần suất (Rate Limit - 429)**:
   - Tần suất mặc định là **100 requests/phút** trên mỗi AppID. Nếu vượt quá, server trả về mã `429 Too Many Requests`. Khuyến nghị thiết lập chu kỳ quét định kỳ từ 1 đến 5 phút cho mỗi nhóm trạm quan trắc.

---

## 7. Các lệnh cURL Mẫu Test Nhanh trên Localhost / Server

Dưới đây là các lệnh cURL mẫu để test nhanh trên máy cục bộ (`http://localhost:8089` hoặc `http://localhost:8080`). Khi triển khai lên server chỉ cần đổi biến `BASE_URL="https://api-htbc.thoatnuochanoi.vn"`.

### 7.1. Script Bash Tự Động Ký & Gọi cURL (`test_api.sh`)

Lưu nội dung dưới đây thành file `test_api.sh`, cấp quyền thực thi `chmod +x test_api.sh` và chạy `./test_api.sh`:

```bash
#!/bin/bash

# ==========================================================
# CẤU HÌNH KẾT NỐI
# ==========================================================
BASE_URL="http://localhost:8089"  # Hoặc https://api-htbc.thoatnuochanoi.vn / https://hsdc.reiway.vn
APP_ID="hsdc-api-2026"
KEY_FILE="hsdc-key-2026-08-18.private.pem"

if [ ! -f "$KEY_FILE" ]; then
    echo "[LỖI] Không tìm thấy file private key: $KEY_FILE"
    exit 1
fi

call_api() {
    local PATH_URI="$1"
    local QUERY="$2"
    local TIMESTAMP=$(date +%s)
    local PAYLOAD="${APP_ID}${TIMESTAMP}${PATH_URI}"

    # Tạo chữ ký RSA SHA-256 (RS256 PKCS#1 v1.5)
    local SIGNATURE=$(printf "%s" "$PAYLOAD" | openssl dgst -sha256 -sign "$KEY_FILE" | openssl base64 -A)

    local FULL_URL="${BASE_URL}${PATH_URI}"
    if [ -n "$QUERY" ]; then
        FULL_URL="${FULL_URL}?${QUERY}"
    fi

    echo "============================================================"
    echo "===> Calling: GET $FULL_URL"
    echo "============================================================"

    curl -s -X GET "$FULL_URL" \
      -H "X-App-Id: ${APP_ID}" \
      -H "X-Timestamp: ${TIMESTAMP}" \
      -H "X-Signature: ${SIGNATURE}" | jq . || curl -s -X GET "$FULL_URL" \
      -H "X-App-Id: ${APP_ID}" \
      -H "X-Timestamp: ${TIMESTAMP}" \
      -H "X-Signature: ${SIGNATURE}"
    echo -e "\n"
}

# 1. Danh sách tất cả các trạm (Master Data)
call_api "/api/public/v1/stations"

# 2. Lọc riêng danh sách Cửa Phai
call_api "/api/public/v1/stations" "type=sluice_gate"

# 3. Lấy dữ liệu Vận hành Cửa Phai
call_api "/api/public/v1/sluice-gate/gate_damchuoi"

# 4. Lấy dữ liệu Mực nước Hồ
call_api "/api/public/v1/water/lake/lake_hoankiem"

# 5. Lấy dữ liệu Mực nước Sông
call_api "/api/public/v1/water/river/river_tolich"

# 6. Lấy dữ liệu Lượng Mưa
call_api "/api/public/v1/rain/rain_lang"

# 7. Lấy dữ liệu Điểm Ngập
call_api "/api/public/v1/inundation/inu_nguyenkhuyen"

# 8. Lấy dữ liệu Trạm Xử lý Nước thải
call_api "/api/public/v1/wastewater/ww_baymau"
```

---

### 7.2. Các Lệnh cURL 1-Liner Tự Động Ký Trên Terminal

#### 1. Lấy danh sách Trạm (Master Data)
```bash
TIMESTAMP=$(date +%s); PATH_URI="/api/public/v1/stations"; SIG=$(printf "%s" "hsdc-api-2026${TIMESTAMP}${PATH_URI}" | openssl dgst -sha256 -sign hsdc-key-2026-08-18.private.pem | openssl base64 -A); curl -X GET "https://api-htbc.thoatnuochanoi.vn${PATH_URI}" -H "X-App-Id: hsdc-api-2026" -H "X-Timestamp: ${TIMESTAMP}" -H "X-Signature: ${SIG}"
```

#### 2. Lấy dữ liệu Vận hành Cửa Phai
```bash
TIMESTAMP=$(date +%s); PATH_URI="/api/public/v1/sluice-gate/gate_damchuoi"; SIG=$(printf "%s" "hsdc-api-2026${TIMESTAMP}${PATH_URI}" | openssl dgst -sha256 -sign hsdc-key-2026-08-18.private.pem | openssl base64 -A); curl -X GET "https://api-htbc.thoatnuochanoi.vn${PATH_URI}" -H "X-App-Id: hsdc-api-2026" -H "X-Timestamp: ${TIMESTAMP}" -H "X-Signature: ${SIG}"
```

#### 3. Lấy dữ liệu Mực nước Hồ
```bash
TIMESTAMP=$(date +%s); PATH_URI="/api/public/v1/water/lake/lake_hoankiem"; SIG=$(printf "%s" "hsdc-api-2026${TIMESTAMP}${PATH_URI}" | openssl dgst -sha256 -sign hsdc-key-2026-08-18.private.pem | openssl base64 -A); curl -X GET "https://api-htbc.thoatnuochanoi.vn${PATH_URI}" -H "X-App-Id: hsdc-api-2026" -H "X-Timestamp: ${TIMESTAMP}" -H "X-Signature: ${SIG}"
```

#### 4. Lấy dữ liệu Trạm Mưa
```bash
TIMESTAMP=$(date +%s); PATH_URI="/api/public/v1/rain/rain_lang"; SIG=$(printf "%s" "hsdc-api-2026${TIMESTAMP}${PATH_URI}" | openssl dgst -sha256 -sign hsdc-key-2026-08-18.private.pem | openssl base64 -A); curl -X GET "https://api-htbc.thoatnuochanoi.vn${PATH_URI}" -H "X-App-Id: hsdc-api-2026" -H "X-Timestamp: ${TIMESTAMP}" -H "X-Signature: ${SIG}"
```

#### 5. Lấy dữ liệu Điểm Ngập (Phố Phú Xá)
```bash
TIMESTAMP=$(date +%s); PATH_URI="/api/public/v1/inundation/inpt_d8c1mi1dlguj7o27p4ng"; SIG=$(printf "%s" "hsdc-api-2026${TIMESTAMP}${PATH_URI}" | openssl dgst -sha256 -sign hsdc-key-2026-08-18.private.pem | openssl base64 -A); curl -X GET "https://api-htbc.thoatnuochanoi.vn${PATH_URI}?start_date=1767200400&end_date=1798736399" -H "X-App-Id: hsdc-api-2026" -H "X-Timestamp: ${TIMESTAMP}" -H "X-Signature: ${SIG}"
```

---

### 7.3. Các Lệnh cURL Mẫu Gắn Sẵn Giá Trị Headers & Chữ Ký Chuẩn

Dưới đây là các câu lệnh cURL mẫu **đã được tạo sẵn đầy đủ toàn bộ Header thực tế** (`X-App-Id`, `X-Timestamp: 1787128800` và chuỗi chữ ký `X-Signature` tính toán chuẩn xác từ Private Key) để đối tác hình dung trực quan cấu trúc của một Request chuẩn:

#### 1. Lấy danh sách Trạm (Master Data)
```bash
curl -X GET "https://api-htbc.thoatnuochanoi.vn/api/public/v1/stations" \
  -H "X-App-Id: hsdc-api-2026" \
  -H "X-Timestamp: 1787128800" \
  -H "X-Signature: QP2saMK9wUeKp4kyJRglgEbLL5TQZdnrUkJMbt4Yw4PNKIceLpTnQg3t8Jo0SYv4nrd23OLaHyTzmBfNniZmkYs1AzT79U2rSgEpSq4KGFBawTCkwKLkioxo66SXnLDfp1sFv/BRvEYGL3XwKtrBr4bf1vGB/9ZRB0slesxilDPiD6/Wun+jmtkDcypoG1+jM1tOacKCQx1UYOeWCM4OgupRc26++5/woKjvcVYzM8KCnyO+30zSdqvSqFzdBez0n+PvdPlMP/K06aiaidSXFFHDACj7t9pa/potX00FWbSuzlJXLZ3Uk+CpvTWpJMevM4Bc/PNmVJ7txC9dnw6LMA=="
```

#### 2. Lọc riêng danh mục Cửa Phai
```bash
curl -X GET "https://api-htbc.thoatnuochanoi.vn/api/public/v1/stations?type=sluice_gate" \
  -H "X-App-Id: hsdc-api-2026" \
  -H "X-Timestamp: 1787128800" \
  -H "X-Signature: QP2saMK9wUeKp4kyJRglgEbLL5TQZdnrUkJMbt4Yw4PNKIceLpTnQg3t8Jo0SYv4nrd23OLaHyTzmBfNniZmkYs1AzT79U2rSgEpSq4KGFBawTCkwKLkioxo66SXnLDfp1sFv/BRvEYGL3XwKtrBr4bf1vGB/9ZRB0slesxilDPiD6/Wun+jmtkDcypoG1+jM1tOacKCQx1UYOeWCM4OgupRc26++5/woKjvcVYzM8KCnyO+30zSdqvSqFzdBez0n+PvdPlMP/K06aiaidSXFFHDACj7t9pa/potX00FWbSuzlJXLZ3Uk+CpvTWpJMevM4Bc/PNmVJ7txC9dnw6LMA=="
```

#### 3. Lấy dữ liệu Vận hành Cửa Phai (Đầm Chuối)
```bash
curl -X GET "https://api-htbc.thoatnuochanoi.vn/api/public/v1/sluice-gate/gate_damchuoi" \
  -H "X-App-Id: hsdc-api-2026" \
  -H "X-Timestamp: 1787128800" \
  -H "X-Signature: YlV/mroil87PPmVj77oK2/jd+FEPe9LicgRf9G7peCHUVc/zJlj01nqK445jB219VC01SnvFZdiMPvNdYm5qREA0csrxyZwt+E+hSjfGFf8CjtnGfDw/ljGXk4C/QPb/Dv8GHOl+lGoKWZ7nN7JS7tvTbMFLOg/fKs8UK0VElT7P05WPoYw2XnABwQhRafZoSqt1F8HTrhESsmpGie/87z8j84GSuXjau2ybO/cWjv9DZ/XcmAgGjwpG+LgSTr7LsMb7LqHljr2X9ksPXcaTXwtPDUFHn306txjPQIxrXC31WTazhKrSBnM0/AbI4eDkVMGtvAWC0/z+ONQZ0bKHBg=="
```

#### 4. Lấy dữ liệu Mực nước Hồ Hoàn Kiếm
```bash
curl -X GET "https://api-htbc.thoatnuochanoi.vn/api/public/v1/water/lake/lake_hoankiem" \
  -H "X-App-Id: hsdc-api-2026" \
  -H "X-Timestamp: 1787128800" \
  -H "X-Signature: yzesYaHQa5Ymno8/BrTAiHJQJa+dWZXHblqkeWwsyIfXImcd7S3L/RO0hOu0Du0c/lQmAhVVDZG1NmGvYD/nj+Oi5A75a8B8j5wrrHlqPc/5mbKSQpGv4bhkSmdIR0f0SVavP+6nMQ2pKBc+t5dssRq0V6Z3k8Ei/Wr5oYDWQqg+P6cHKPIiwd0I7VBri8h9N0ijgZcPVlf/G46Vux33fYBtOPnGUsefjBDzqaUeDiviPHi7uPAM/TdZCQsP7xEI0a7T3ikCF+YRi/bzxyDdt46fcq+RAYowuFFV+CwjzXIp8B9vfXfKbkcy03n90xXHfUEStlIuqd++deHDdzpBNA=="
```

#### 5. Lấy dữ liệu Mực nước Sông Tô Lịch
```bash
curl -X GET "https://api-htbc.thoatnuochanoi.vn/api/public/v1/water/river/river_tolich" \
  -H "X-App-Id: hsdc-api-2026" \
  -H "X-Timestamp: 1787128800" \
  -H "X-Signature: fPaoZuqK6VyrMD6rFbvb0gRSZDHTggmUQUrz1nMsOyO238luX1uevAd6/p3AVJA5LncDJ8FBrRkGNcHoL6vm80J0atYB2+L+ZpZOLM1aDJGyv4UD0yzVDzMf1fQsz19kgOeiYhGd8BMqEzAmQRaYw7ZxeMwi98FOUCVzzq3a/3hHwS6EElbDMuYJI68Pi/rCqQxT83k8DP3u7cTFtA4gv4P1Gb/kSZ4fjPWXWteq8dy2RfrNaoPopWMUFyC8lwae9dhvC7XE6ipoKTF1/EX8hzsArXX85uSycmTQXiVZTLbXf6FCks2VZduelWW6b3FuprzBOxm5ex2jXv4YLnZ8gg=="
```

#### 6. Lấy dữ liệu Lượng Mưa Trạm Láng
```bash
curl -X GET "https://api-htbc.thoatnuochanoi.vn/api/public/v1/rain/rain_lang" \
  -H "X-App-Id: hsdc-api-2026" \
  -H "X-Timestamp: 1787128800" \
  -H "X-Signature: YMRMgz0hTfMe8hPvmBudSMlKnXjzh1RV9ZR5d9w/CurkjusTl2vEgNcbnkYi4r7yjhDeQqNeDqdvppRpkzJa33EMIA46+Yk5djk/T5hWWOleKCSV65EmJYD/nXX/bMEu+ps3FQizjlOmwsVYySBJ4VL1qYeVwcnrTVhIZRNRKEMe470NOm/b3x1gcjwY4GrPvox8WGyu0RAeNs/PHIW0njvg/hGQFItZakNu6ELSMu/QO6zwPbZlIZU+CEileFCV65bnf5FRTepKDcfy3mTdap8X9cbl3GYsSWpWdWajpbvPtFROv+o5t/8KiuCC+X9x+S/4xVsHP8pOazhIiIruSw=="
```

#### 7. Lấy dữ liệu Điểm Ngập (Phố Phú Xá) Năm 2026
```bash
curl -X GET "https://api-htbc.thoatnuochanoi.vn/api/public/v1/inundation/inpt_d8c1mi1dlguj7o27p4ng?start_date=1767200400&end_date=1798736399" \
  -H "X-App-Id: hsdc-api-2026" \
  -H "X-Timestamp: 1787128800" \
  -H "X-Signature: vi2mj1tNxqHeqP9xAOA33dpQOGojPueDU/LWysNEMnBIrgd2se7MFHSXtxxqQFZz+l9piOohpVwjFBDPGvYEkt+DRbiVXjqRXBgqArvjq81ZBo8ox2oDeT2+gBAYNFsuNf6CK69WVBEvMzbwvI6O//c+fLZbeDabahx8HE8UaWq8V0mtfeEjxnyGbR9rTja4oGwrYj7EZcViFeTjHns+mVXjSzA1+hNj3sISEiwo0cb2PEU/x8JfhJ/xQyjdbbo56UtkKfI9reGKKR9/nQJJbR+2JMuVouoECOJnrDRT05O0Zr1QuOgLkuEeXp9c/rrdGQN6YQsur45ZRisHEkQO/w=="
```

#### 8. Lấy dữ liệu Trạm Xử lý Nước thải Bảy Mẫu
```bash
curl -X GET "https://api-htbc.thoatnuochanoi.vn/api/public/v1/wastewater/ww_baymau" \
  -H "X-App-Id: hsdc-api-2026" \
  -H "X-Timestamp: 1787128800" \
  -H "X-Signature: X1tBSAz+5AnN4/DlRTf4RveI5pctFsR8TbSKbBLlovD6suHrxkuF/rYIWhFKQWepGZJyyISkiVb1sM4V7kfIzDfP6CbEvmEkkZ9Pq+jPuY7IaatifGPrggH9AfHt/fF1sYodSqJW9ikW0ljLckMRt/AnIteL/w0CcaLY8mSBJowre9V5bST+MP/xvJGZqRuNv2vhVp0an3u+MOK0zJOlyzPz0zip9OSt41e6faTZnNKmZMsUr000wkxITX7KGaZeGkQafNJxZmVV2ob36yLmE/P4HedKs50RqWoLeJYV7oBKZFoln0QBcMDtE0/y0FLzOrVxhR5CDnvrLr6FMHG2DA=="
```



