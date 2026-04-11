import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import pumpingStationApi from 'api/pumpingStation';
import { toast } from 'react-hot-toast';

const PumpingStationDialog = ({ open, handleClose, item, refresh, organizations = { primary: [], shared: [] } }) => {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        org_id: '',
        pump_count: 0,
        active: true,
        link: '',
        is_auto: false,
        org_id: '',
        shared_org_ids: []
    });

    useEffect(() => {
        if (open) {
            if (item) {
                setFormData({
                    ...item,
                    shared_org_ids: item.shared_org_ids || []
                });
            } else {
                setFormData({
                    name: '',
                    address: '',
                    pump_count: 0,
                    active: true,
                    link: '',
                    is_auto: false,
                    org_id: '',
                    shared_org_ids: []
                });
            }
        }
    }, [item, open]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name) return toast.error("Vui lòng nhập tên trạm bơm");
        if (!formData.org_id) return toast.error("Vui lòng chọn đơn vị quản lý");

        try {
            const payload = {
                ...formData,
                pump_count: parseInt(formData.pump_count),
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
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 800 }}>{item ? 'Chỉnh sửa trạm bơm' : 'Thêm trạm bơm mới'}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
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
                    <FormControl fullWidth>
                        <InputLabel>Đơn vị quản lý</InputLabel>
                        <Select
                            name="org_id"
                            value={formData.org_id}
                            label="Đơn vị quản lý"
                            onChange={handleChange}
                        >
                            <MenuItem value=""><em>-- Chọn đơn vị --</em></MenuItem>
                            {organizations.map((org) => (
                                <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth label="Số lượng máy bơm" type="number"
                        value={formData.pump_count}
                        onChange={(e) => handleChange('pump_count', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />

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

                    <Autocomplete
                        multiple
                        fullWidth
                        options={(organizations.shared || []).filter(org => org.id !== formData.org_id)}
                        getOptionLabel={(option) => option.name}
                        value={(organizations.shared || []).filter(org => formData.shared_org_ids?.includes(org.id))}
                        onChange={(event, newValue) => {
                            handleChange('shared_org_ids', newValue.map(org => org.id));
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Đơn vị phối hợp" placeholder="Chọn đơn vị" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                        )}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip
                                    variant="outlined" label={option.name}
                                    {...getTagProps({ index })} key={option.id}
                                    size="small" sx={{ borderRadius: '8px', fontWeight: 600 }}
                                />
                            ))
                        }
                    />

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
