import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, 
    FormControlLabel, Checkbox, Stack, MenuItem, Grid, useMediaQuery 
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MultiSelectCheckboxes from 'ui-component/MultiSelectCheckboxes';
import pumpingStationApi from 'api/pumpingStation';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';

const PumpingStationDialog = ({ open, handleClose, item, refresh, organizations = { primary: [], shared: [] } }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { isCompany, user } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        pump_count: 0,
        active: true,
        link: '',
        is_auto: false,
        org_id: '',
        shared_org_ids: [],
        share_all: false,
        priority: 0
    });

    useEffect(() => {
        if (open) {
            if (item) {
                setFormData({
                    ...item,
                    shared_org_ids: item.shared_org_ids || [],
                    share_all: item.share_all || false
                });
            } else {
                setFormData({
                    name: '',
                    address: '',
                    pump_count: 0,
                    active: true,
                    link: '',
                    is_auto: false,
                    org_id: isCompany ? '' : (user?.org_id || ''),
                    shared_org_ids: [],
                    share_all: false,
                    priority: 0
                });
            }
        }
    }, [item, open]);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            if (field === 'share_all' && value === true) {
                newData.shared_org_ids = [];
            }
            return newData;
        });
    };

    const handleSubmit = async () => {
        if (!formData.name) return toast.error("Vui lòng nhập tên trạm bơm");
        if (!formData.org_id) return toast.error("Vui lòng chọn đơn vị quản lý");

        try {
            const payload = {
                ...formData,
                pump_count: parseInt(formData.pump_count),
                priority: parseInt(formData.priority) || 0,
            };
            if (item) {
                await pumpingStationApi.update(item.id, payload);
                toast.success('Cập nhật thành công');
            } else {
                await pumpingStationApi.create(payload);
                toast.success('Thêm mới thành công');
            }
            refresh();
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Thao tác thất bại');
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            fullWidth 
            maxWidth="sm"
            fullScreen={isMobile}
            slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : 3 } } }}
        >
            <DialogTitle sx={{ fontWeight: 800, p: { xs: 2, sm: 3 }, bgcolor: 'grey.50' }}>{item ? 'Chỉnh sửa trạm bơm' : 'Thêm trạm bơm mới'}</DialogTitle>
            <DialogContent dividers sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack spacing={2.5} sx={{ mt: 0.5 }}>
                    <TextField
                        fullWidth label="Tên trạm bơm" required
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                    <TextField
                        fullWidth label="Địa chỉ"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                    <TextField
                        fullWidth label="Số lượng máy bơm" type="number"
                        value={formData.pump_count}
                        onChange={(e) => handleChange('pump_count', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Trọng số BC" type="number"
                                value={formData.priority}
                                onChange={(e) => handleChange('priority', e.target.value)}
                                helperText="Số nhỏ = ưu tiên cao"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </Grid>
                    </Grid>

                    <TextField
                        fullWidth select label="Đơn vị quản lý" required
                        value={formData.org_id}
                        onChange={(e) => handleChange('org_id', e.target.value)}

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
                            label="Đơn vị phối hợp"
                            placeholder="Chọn đơn vị"
                            options={(organizations.shared || []).filter((org) => org.id !== formData.org_id)}
                            value={formData.shared_org_ids}
                            onChange={(ids) => handleChange('shared_org_ids', ids)}
                        />
                    )}

                    <TextField
                        fullWidth label="Link quản lý"
                        value={formData.link}
                        onChange={(e) => handleChange('link', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                    <Stack direction="row" spacing={3}>
                        <FormControlLabel
                            control={<Checkbox checked={formData.is_auto} onChange={(e) => handleChange('is_auto', e.target.checked)} />}
                            label="Tự động (Auto)"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={formData.active} onChange={(e) => handleChange('active', e.target.checked)} />}
                            label="Hoạt động"
                        />
                    </Stack>
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

export default PumpingStationDialog;
