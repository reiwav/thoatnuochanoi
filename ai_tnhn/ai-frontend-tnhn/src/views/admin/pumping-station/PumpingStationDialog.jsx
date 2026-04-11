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
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import pumpingStationApi from 'api/pumpingStation';
import { toast } from 'react-hot-toast';

const PumpingStationDialog = ({ open, handleClose, item, refresh, organizations = [] }) => {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        org_id: '',
        pump_count: 0,
        active: true,
        link: '',
        is_auto: false,
    });

    useEffect(() => {
        if (item) {
            setFormData(item);
        } else {
            setFormData({
                name: '',
                address: '',
                org_id: '',
                pump_count: 0,
                active: true,
                link: '',
                is_auto: false,
            });
        }
    }, [item, open]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = async () => {
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
            toast.error('Thao tác thất bại');
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>{item ? 'Chỉnh sửa trạm bơm' : 'Thêm trạm bơm mới'}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        fullWidth
                        label="Tên trạm bơm"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Địa chỉ"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
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
                        fullWidth
                        label="Số lượng máy bơm"
                        name="pump_count"
                        type="number"
                        value={formData.pump_count}
                        onChange={handleChange}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Link quản lý"
                        name="link"
                        value={formData.link}
                        onChange={handleChange}
                    />
                    <Stack direction="row" spacing={2}>
                        <FormControlLabel
                            control={<Checkbox name="is_auto" checked={formData.is_auto} onChange={handleChange} />}
                            label="Tự động (Auto)"
                        />
                        <FormControlLabel
                            control={<Checkbox name="active" checked={formData.active} onChange={handleChange} />}
                            label="Hoạt động"
                        />
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Hủy</Button>
                <Button variant="contained" onClick={handleSubmit}>
                    {item ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PumpingStationDialog;
