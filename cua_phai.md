# Kế hoạch: Module Quản lý Cửa phai
Cửa phai = cửa dùng để đóng/mở, điều tiết dòng nước trong kênh mương, đập, ao hồ.
## Yêu cầu
- Làm cửa phai giống với QUẢN LÝ TRẠM XLNT
- Nhân viên cũng thế
- Viết code ra component riêng, không dính vào mấy cái khác

---

## Phân tích module XLNT làm mẫu

Module XLNT gồm các file:
```
src/views/admin/wastewater-treatment/
  index.jsx                         # Trang chính: danh sách, bảng desktop, card mobile
  WastewaterTreatmentDialog.jsx     # Dialog thêm/sửa
  WastewaterTreatmentHistoryDialog.jsx  # Dialog xem lịch sử báo cáo
  WastewaterTreatmentReport.jsx     # Component báo cáo vận hành (dùng cho employee)

src/api/wastewaterTreatment.js      # API client

Routes:
  admin/wastewater-treatment        -> WastewaterTreatmentPage
  employee/wastewater-treatment     -> EmployeeWastewaterPage
```

---

## Cấu trúc file cần tạo

```
src/api/sluiceGate.js                       # [NEW] API client

src/views/admin/sluice-gate/
  index.jsx                                  # [NEW] Trang danh sách cửa phai (Admin)
  SluiceGateDialog.jsx                       # [NEW] Dialog thêm/sửa cửa phai
  SluiceGateHistoryDialog.jsx                # [NEW] Dialog xem lịch sử báo cáo
  SluiceGateReport.jsx                       # [NEW] Component báo cáo vận hành

src/views/employee/sluice-gate/
  index.jsx                                  # [NEW] Trang nhân viên chọn cửa phai & báo cáo

src/routes/MainRoutes.jsx                    # [MODIFY] Thêm 2 route mới
```

---

## Chi tiết từng file

### 1. `src/api/sluiceGate.js`

```js
import axiosClient from './axiosClient';

const sluiceGateApi = {
    list: (params) => axiosClient.get('/admin/stations/sluice-gate', { params }),
    get: (id) => axiosClient.get(`/admin/stations/sluice-gate/${id}`),
    create: (data) => axiosClient.post('/admin/stations/sluice-gate', data),
    update: (id, data) => axiosClient.put(`/admin/stations/sluice-gate/${id}`, data),
    delete: (id) => axiosClient.delete(`/admin/stations/sluice-gate/${id}`),
    report: (id, data) => axiosClient.post(`/admin/stations/sluice-gate/${id}/report`, data),
    getHistory: (id, params) => axiosClient.get(`/admin/stations/sluice-gate/${id}/history`, { params }),
};

export default sluiceGateApi;
```

---

### 2. `src/views/admin/sluice-gate/SluiceGateDialog.jsx`

Dialog thêm/sửa cửa phai. Trường dữ liệu:
- `name` (string, required): Tên cửa phai
- `address` (string): Địa chỉ
- `org_id` (string, required): Đơn vị quản lý
- `shared_org_ids` (array): Đơn vị phối hợp
- `share_all` (bool): Chia sẻ tất cả
- `priority` (number): Trọng số báo cáo
- `active` (bool): Hoạt động

```jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField,
    FormControlLabel, Checkbox, Stack, MenuItem, Grid, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MultiSelectCheckboxes from 'ui-component/MultiSelectCheckboxes';
import sluiceGateApi from 'api/sluiceGate';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';

const SluiceGateDialog = ({ open, handleClose, item, refresh, organizations = { primary: [], shared: [] } }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { isCompany, user } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '', address: '', active: true,
        org_id: '', shared_org_ids: [], share_all: false, priority: 0
    });

    useEffect(() => {
        if (open) {
            if (item) {
                setFormData({ ...item, shared_org_ids: item.shared_org_ids || [], share_all: item.share_all || false });
            } else {
                setFormData({
                    name: '', address: '', active: true,
                    org_id: isCompany ? '' : (user?.org_id || ''),
                    shared_org_ids: [], share_all: false, priority: 0
                });
            }
        }
    }, [item, open]);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'share_all' && value) next.shared_org_ids = [];
            return next;
        });
    };

    const handleSubmit = async () => {
        if (!formData.name) return toast.error('Vui lòng nhập tên cửa phai');
        if (!formData.org_id) return toast.error('Vui lòng chọn đơn vị quản lý');
        try {
            const payload = { ...formData, priority: parseInt(formData.priority) || 0 };
            if (item) {
                await sluiceGateApi.update(item.id, payload);
                toast.success('Cập nhật thành công');
            } else {
                await sluiceGateApi.create(payload);
                toast.success('Thêm mới thành công');
            }
            refresh();
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Thao tác thất bại');
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm"
            fullScreen={isMobile}
            slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : 3 } } }}
        >
            <DialogTitle sx={{ fontWeight: 800, p: { xs: 2, sm: 3 }, bgcolor: 'grey.50' }}>
                {item ? 'Chỉnh sửa cửa phai' : 'Thêm cửa phai mới'}
            </DialogTitle>
            <DialogContent dividers sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack spacing={2.5} sx={{ mt: 0.5 }}>
                    <TextField fullWidth label="Tên cửa phai" required
                        value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                    <TextField fullWidth label="Địa chỉ"
                        value={formData.address} onChange={(e) => handleChange('address', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Trọng số BC" type="number"
                                value={formData.priority}
                                onChange={(e) => handleChange('priority', e.target.value)}
                                helperText="Số nhỏ = ưu tiên cao"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                            <FormControlLabel
                                control={<Checkbox checked={formData.active} onChange={(e) => handleChange('active', e.target.checked)} />}
                                label="Hoạt động"
                            />
                        </Grid>
                    </Grid>
                    <TextField fullWidth select label="Đơn vị quản lý" required
                        value={formData.org_id} onChange={(e) => handleChange('org_id', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    >
                        {(organizations.primary || []).map((org) => (
                            <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                        ))}
                    </TextField>
                    <FormControlLabel
                        control={<Checkbox checked={formData.share_all} onChange={(e) => handleChange('share_all', e.target.checked)} color="secondary" />}
                        label="Chia sẻ với tất cả xí nghiệp"
                    />
                    {!formData.share_all && (
                        <MultiSelectCheckboxes
                            label="Đơn vị phối hợp" placeholder="Chọn đơn vị"
                            options={(organizations.shared || []).filter((org) => org.id !== formData.org_id)}
                            value={formData.shared_org_ids}
                            onChange={(ids) => handleChange('shared_org_ids', ids)}
                        />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose} color="inherit">Hủy</Button>
                <Button variant="contained" onClick={handleSubmit} color="primary">
                    {item ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SluiceGateDialog;
```

---

### 3. `src/views/admin/sluice-gate/SluiceGateHistoryDialog.jsx`

Dialog xem lịch sử báo cáo. Copy từ `WastewaterTreatmentHistoryDialog` thay:
- API: `sluiceGateApi.getHistory`
- Text: "Lịch sử báo cáo Cửa phai: {item?.name}"
- Import: `IconDoor` (hoặc icon phù hợp với cửa phai)

```jsx
// Tương tự WastewaterTreatmentHistoryDialog.jsx
// Chỉ thay wastewaterTreatmentApi -> sluiceGateApi
// Thay text "XLNT" -> "Cửa phai"
```

---

### 4. `src/views/admin/sluice-gate/SluiceGateReport.jsx`

Component báo cáo vận hành cho nhân viên. Copy từ `WastewaterTreatmentReport` thay:
- API: `sluiceGateApi.report`, `sluiceGateApi.getHistory`
- Text: "Báo cáo vận hành cửa phai"
- Permission: `sluice-gate:report`
- Icon: thay `IconDroplets` bằng icon phù hợp

```jsx
// Tương tự WastewaterTreatmentReport.jsx
// Chỉ thay API và text label
```

---

### 5. `src/views/admin/sluice-gate/index.jsx`

Trang quản lý cửa phai (Admin). Copy từ `wastewater-treatment/index.jsx` thay:
- API: `sluiceGateApi`
- Import components mới: `SluiceGateDialog`, `SluiceGateHistoryDialog`
- Title: "QUẢN LÝ CỬA PHAI"
- Button: "Thêm cửa phai"
- Permission prefix: `sluice-gate:*`
- Placeholder search: "Tìm kiếm cửa phai"
- Empty text: "Không có dữ liệu cửa phai"
- Table header: STT | Tên cửa phai | Địa chỉ | Đơn vị quản lý | Ưu tiên | Thao tác

```jsx
import sluiceGateApi from 'api/sluiceGate';
import SluiceGateDialog from './SluiceGateDialog';
import SluiceGateHistoryDialog from './SluiceGateHistoryDialog';
// ... clone cấu trúc WastewaterTreatmentPage, đổi tên biến/text
```

---

### 6. `src/views/employee/sluice-gate/index.jsx`

Trang nhân viên. Clone từ employee wastewater page. Nhân viên:
- Xem danh sách cửa phai mình quản lý
- Chọn cửa phai → xem/gửi báo cáo vận hành (dùng `SluiceGateReport`)

---

### 7. `src/routes/MainRoutes.jsx` - Thêm 2 route

```jsx
// Thêm lazy imports:
const SluiceGatePage = Loadable(lazy(() => import('views/admin/sluice-gate')));
const EmployeeSluiceGatePage = Loadable(lazy(() => import('views/employee/sluice-gate')));

// Trong admin routes:
{ path: 'sluice-gate', element: <SluiceGatePage /> },

// Trong employee routes:
{ path: 'sluice-gate', element: <EmployeeSluiceGatePage /> },
```

---

## Thứ tự thực hiện

1. `src/api/sluiceGate.js`
2. `src/views/admin/sluice-gate/SluiceGateDialog.jsx`
3. `src/views/admin/sluice-gate/SluiceGateHistoryDialog.jsx`
4. `src/views/admin/sluice-gate/SluiceGateReport.jsx`
5. `src/views/admin/sluice-gate/index.jsx`
6. `src/views/employee/sluice-gate/index.jsx`
7. `src/routes/MainRoutes.jsx`

---

## Permission keys cần backend support

```
sluice-gate:view
sluice-gate:create
sluice-gate:edit
sluice-gate:delete
sluice-gate:report
sluice-gate:control
```

---

## API endpoint backend cần có (giống XLNT)

```
GET    /admin/stations/sluice-gate              # Danh sách
POST   /admin/stations/sluice-gate              # Tạo mới
PUT    /admin/stations/sluice-gate/:id          # Cập nhật
DELETE /admin/stations/sluice-gate/:id          # Xóa
POST   /admin/stations/sluice-gate/:id/report   # Gửi báo cáo
GET    /admin/stations/sluice-gate/:id/history  # Lịch sử báo cáo
```

---

## Cập nhật phân quyền nhân viên (Employee Assignment)

Cần cập nhật `src/views/admin/employee/EmployeeDialog.jsx` để Admin có thể gán Cửa phai cho nhân viên:

1.  **State**: Thêm `sluiceGates` và `assigned_sluice_gate_id`.
2.  **Fetch Data**: Gọi `sluiceGateApi.list()` khi mở Dialog.
3.  **UI**: Thêm `Select` box cho phép chọn Cửa phai trong danh sách được gán.
4.  **Backend**: User model cần có trường `assigned_sluice_gate_id`.

---

## Cập nhật Phân quyền (Role Matrix)

Để đồng bộ với Trạm XLNT, nhóm quyền **Cửa phai** cần có đủ 6 hành động:

1.  **Hành động**: Xem, Thêm, Sửa, Xóa, Nhập báo cáo, Điều khiển.
2.  **Permission Keys**:
    *   `sluice-gate:view`: Xem danh sách, lịch sử.
    *   `sluice-gate:create`: Thêm mới cửa phai.
    *   `sluice-gate:edit`: Cập nhật thông tin.
    *   `sluice-gate:delete`: Xóa cửa phai.
    *   `sluice-gate:report`: Nhân viên gửi báo cáo vận hành.
    *   `sluice-gate:control`: Đóng/mở cửa phai.
3.  **Cập nhật Backend**:
    *   Cập nhật file `ai-api-tnhn/cmd/seed/main.go` để thay thế `cuapai:*` bằng `sluice-gate:*`.
    *   Mở comment phần gán quyền cho Admin trong file seed để tự động cấp quyền.
    *   Chạy lệnh seed để cập nhật database:
        ```bash
        cd ai_tnhn/ai-api-tnhn && go run cmd/seed/main.go
        ```