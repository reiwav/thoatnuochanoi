# AI Chat Hợp Đồng - Kế Hoạch Triển Khai

## Tổng quan
Xây dựng tính năng **Chat AI** chuyên biệt cho quản lý hợp đồng. Tách riêng hàm `ChatContract` ra file riêng trong package `gemini` để dễ phân quyền theo vai trò người dùng sau này.

---

## Kiến trúc tách file

```
internal/service/gemini/
├── service.go           ← Chat() hiện tại (HTBC mùa mưa) — KHÔNG ĐỘNG VÀO
├── contract_chat.go     ← ChatContract() MỚI — tools + logic riêng cho hợp đồng
```

Cả hai hàm `Chat` và `ChatContract` đều thuộc cùng `type service struct`, dùng chung `genai.Client` và `model`, nhưng mỗi hàm tự định nghĩa **SystemInstruction** và **Tools** riêng khi gọi.

---

## Phase 1: Backend — Query dữ liệu hợp đồng

### 1.1. Tạo file `internal/service/contract/query.go`
Thêm các method mới vào `contract.Service` (interface + implementation):

| Method | Mô tả | Dữ liệu trả về |
|--------|-------|----------------|
| `GetExpiringSoon(ctx, days int)` | HĐ sắp hết hạn trong N ngày tới | `[]ContractQueryResult` |
| `GetExpired(ctx)` | HĐ đã hết hạn | `[]ContractQueryResult` |
| `GetStagesDueSoon(ctx, days int)` | Giai đoạn thanh toán sắp đến hạn | `[]StageQueryResult` |
| `GetStagesPassed(ctx)` | Giai đoạn đã qua hạn | `[]StageQueryResult` |
| `GetContractSummary(ctx)` | Tổng quan: tổng HĐ, đang hiệu lực, hết hạn, sắp hết hạn | `ContractSummaryStats` |
| `SearchContracts(ctx, keyword)` | Tìm kiếm HĐ theo tên | `[]ContractQueryResult` |

**Struct kết quả (trong `query.go`):**
```go
type ContractQueryResult struct {
    ID              string  `json:"id"`
    Name            string  `json:"name"`
    CategoryName    string  `json:"category_name"`
    StartDate       string  `json:"start_date"`
    EndDate         string  `json:"end_date"`
    DaysRemaining   int     `json:"days_remaining"`   // âm = đã quá hạn
    DriveFolderLink string  `json:"drive_folder_link"`
    TotalValue      float64 `json:"total_value"`
}

type StageQueryResult struct {
    ContractID      string  `json:"contract_id"`
    ContractName    string  `json:"contract_name"`
    StageName       string  `json:"stage_name"`
    Amount          float64 `json:"amount"`
    Date            string  `json:"date"`
    DaysRemaining   int     `json:"days_remaining"`
    DriveFolderLink string  `json:"drive_folder_link"`
}

type ContractSummaryStats struct {
    Total          int     `json:"total"`
    Active         int     `json:"active"`
    Expired        int     `json:"expired"`
    ExpiringSoon30 int     `json:"expiring_soon_30d"`
    TotalValue     float64 `json:"total_value"`
}
```

> Mỗi kết quả có `drive_folder_link` để AI gắn link cho user click xem tài liệu trên Drive.

### 1.2. Cập nhật interface `contract.Service`
Thêm 6 method vào interface trong `service.go`, nhưng implement ở file `query.go`.

---

## Phase 2: Backend — Hàm ChatContract riêng

### 2.1. Tạo file `internal/service/gemini/contract_chat.go`

```go
package gemini

// ChatContract xử lý chat AI chuyên biệt cho quản lý hợp đồng.
// Tách riêng để phân quyền theo vai trò người dùng.
func (s *service) ChatContract(ctx context.Context, prompt string, history []ChatMessage, userID string) (string, error) {
    // 1. Tạo model mới với SystemInstruction riêng cho hợp đồng
    // 2. Định nghĩa tools riêng (chỉ tools liên quan hợp đồng)
    // 3. Xử lý tool calling loop giống Chat() nhưng switch-case chỉ có contract tools
}
```

**SystemInstruction riêng:**
```
Bạn là trợ lý AI chuyên quản lý hợp đồng của Hệ thống Thoát nước Hà Nội.

QUY TẮC:
1. Khi báo cáo hợp đồng, LUÔN gắn link Drive nếu có (drive_folder_link).
2. Hiển thị thời hạn: "DD/MM/YYYY (còn X ngày)" hoặc "(đã quá hạn X ngày)".
3. Khi liệt kê HĐ bảng, thêm cột 'Tài liệu' chứa link [Xem Drive](link).
4. Hiển thị số tiền theo format VNĐ.
5. Giai đoạn thanh toán: tên, số tiền, ngày, trạng thái (sắp đến hạn/đã qua).
```

**Tools (FunctionDeclarations):**

| Tool | Mô tả | Params |
|------|-------|--------|
| `get_contract_summary` | Tổng quan hợp đồng | — |
| `get_expiring_contracts` | HĐ sắp hết hạn | `days` (int, mặc định 30) |
| `get_expired_contracts` | HĐ đã hết hạn | — |
| `get_contract_stages_due_soon` | Giai đoạn sắp đến hạn | `days` (int, mặc định 30) |
| `get_contract_stages_passed` | Giai đoạn đã qua hạn | — |
| `search_contracts` | Tìm HĐ theo tên | `keyword` (string, required) |

**Tool call handler (switch-case):**
```go
case "get_contract_summary":
    result, toolErr = s.contractSvc.GetContractSummary(gCtx)
case "get_expiring_contracts":
    days := 30
    if d, ok := call.Args["days"].(float64); ok && d > 0 { days = int(d) }
    result, toolErr = s.contractSvc.GetExpiringSoon(gCtx, days)
case "get_expired_contracts":
    result, toolErr = s.contractSvc.GetExpired(gCtx)
case "get_contract_stages_due_soon":
    days := 30
    if d, ok := call.Args["days"].(float64); ok && d > 0 { days = int(d) }
    result, toolErr = s.contractSvc.GetStagesDueSoon(gCtx, days)
case "get_contract_stages_passed":
    result, toolErr = s.contractSvc.GetStagesPassed(gCtx)
case "search_contracts":
    keyword, _ := call.Args["keyword"].(string)
    result, toolErr = s.contractSvc.SearchContracts(gCtx, keyword)
```

### 2.2. Cập nhật `service.go` — Interface + DI

**Interface thêm method:**
```go
type Service interface {
    Chat(ctx, prompt, history, userID) (string, error)
    ChatContract(ctx, prompt, history, userID) (string, error)  // MỚI
}
```

**Struct thêm dependency:**
```go
type service struct {
    // ... existing fields
    contractSvc contract.Service  // MỚI
}
```

**NewService thêm param:**
```go
func NewService(apiKey string, ..., contractSvc contract.Service) (Service, error)
```

### 2.3. Cập nhật `main.go`
Truyền `contractService` vào `gemini.NewService(...)`.

---

## Phase 3: Backend — API Endpoint

### 3.1. Thêm handler `ChatContract` trong `handler/google.go`
```go
func (h *GoogleHandler) ChatContract(c *gin.Context) {
    // Giống Chat() nhưng gọi h.geminiSvc.ChatContract()
}
```

### 3.2. Đăng ký route
File: `router/google.go` (hoặc nơi đăng ký routes)
```go
group.POST("/contract-chat", handler.ChatContract)
```
> Route: `POST /admin/google/contract-chat`
> Middleware phân quyền: `ROLE_SUPER_ADMIN`, `ROLE_MANAGER`

---

## Phase 4: Frontend — Giao diện Chat

### 4.1. Thêm menu sidebar
File: `src/menu-items/admin.js`
```js
{
    id: 'ai-contract',
    title: 'AI Hợp đồng',
    type: 'item',
    url: '/admin/ai-contract',
    icon: icons.IconMessageChatbot,
    breadcrumbs: false,
    roles: ['super_admin', 'manager']
},
```
> Đặt ngay sau item "Quản lý hợp đồng"

### 4.2. Tạo trang Chat
File: `src/views/admin/ai-contract/index.jsx`

Clone từ `ai-support/index.jsx`, thay đổi:

| Mục | Thay đổi |
|-----|---------|
| Header title | `"AI Hợp đồng"` |
| Header subtitle | `"Trợ lý quản lý hợp đồng"` |
| API endpoint | `POST /admin/google/contract-chat` (thay vì `/chat`) |
| Header buttons | **Bỏ hết** (BC mùa mưa, BC Words, BC CT KC) |
| Sidebar stats | **Bỏ hết** (Email, Drive quota) |
| Câu hỏi nhanh | 5 câu cho hợp đồng (xem bên dưới) |
| Link handler | Thêm `#contract-detail-{id}` → mở tab chi tiết |

### 4.3. Câu hỏi nhanh (Quick Questions)
```js
[
    'Tổng quan hợp đồng hiện tại?',
    'Hợp đồng nào sắp hết hạn?',
    'Hợp đồng đã hết hạn?',
    'Giai đoạn thanh toán sắp đến hạn?',
    'Giai đoạn thanh toán đã quá hạn?',
]
```

### 4.4. Đăng ký route frontend
File: `src/routes/AdminRoutes.js`
```js
{ path: '/admin/ai-contract', element: <AiContract /> }
```

### 4.5. API client
File: `src/api/contract.js`
```js
chatContract: (data) => axiosClient.post('/admin/google/contract-chat', data),
```

---

## Luồng hoạt động

```
User click "AI Hợp đồng" trên sidebar
  → Mở trang /admin/ai-contract
  → Hiển thị 5 câu hỏi nhanh

User click "Hợp đồng nào sắp hết hạn?"
  → POST /admin/google/contract-chat { prompt, history }
  → geminiSvc.ChatContract(ctx, prompt, history, userID)
  → Gemini gọi tool get_expiring_contracts(days=30)
  → contractSvc.GetExpiringSoon(ctx, 30)
  → Trả về []ContractQueryResult
  → Gemini format thành bảng Markdown kèm link Drive
  → Hiển thị trong chat bubble
```

---

## Thứ tự triển khai

| Bước | File | Mô tả |
|------|------|-------|
| 1 | `internal/service/contract/query.go` | Tạo mới — 6 method query |
| 2 | `internal/service/contract/service.go` | Thêm 6 method vào interface |
| 3 | `internal/service/gemini/contract_chat.go` | Tạo mới — ChatContract + tools + handler |
| 4 | `internal/service/gemini/service.go` | Thêm ChatContract vào interface, thêm contractSvc vào struct |
| 5 | `main.go` | Inject contractService vào gemini.NewService |
| 6 | `handler/google.go` | Thêm handler ChatContract |
| 7 | Router file | Đăng ký route `/contract-chat` |
| 8 | `src/menu-items/admin.js` | Thêm menu "AI Hợp đồng" |
| 9 | `src/views/admin/ai-contract/index.jsx` | Tạo mới — Clone chat UI |
| 10 | `src/routes/AdminRoutes.js` | Đăng ký route frontend |

---

## Lợi ích kiến trúc tách file

- **Phân quyền**: Sau này chỉ cần kiểm tra role ở router/middleware → gọi `ChatContract` hay `Chat`
- **Isolated tools**: Tools hợp đồng không "ô nhiễm" tools mưa/ngập/email → AI tập trung hơn, response nhanh hơn
- **Dễ mở rộng**: Thêm `ChatFinance`, `ChatHR`... chỉ cần tạo file mới trong `gemini/` + thêm method vào interface
- **Bảo trì**: Sửa logic hợp đồng không ảnh hưởng chat mùa mưa và ngược lại