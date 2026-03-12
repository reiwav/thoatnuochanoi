import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, IconButton, Stack,
    Typography, Box, MenuItem
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import organizationApi from 'api/organization';

const ConstructionDialog = ({ open, onClose, onSubmit, item, isEdit }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        start_date: 0,
        end_date: 0,
        status: 'planned',
        cost: 0,
        org_id: ''
    });

    const [organizations, setOrganizations] = useState([]);

    const fetchOrganizations = async () => {
        try {
            const res = await organizationApi.getAll({ per_page: 1000 });
            if (res.data?.status === 'success') {
                setOrganizations(res.data.data?.data || []);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách công ty:', err);
        }
    };

    useEffect(() => {
        if (open) {
            fetchOrganizations();
            if (isEdit && item) {
                setFormData({
                    name: item.name || '',
                    description: item.description || '',
                    status: item.status || 'ongoing',
                    org_id: item.org_id || ''
                });
            } else {
                setFormData({
                    name: '',
                    description: '',
                    status: 'ongoing',
                    org_id: ''
                });
            }
        }
    }, [open, isEdit, item]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        if (!formData.name) return toast.error("Vui lòng nhập tên công trình");
        if (!formData.org_id) return toast.error("Vui lòng chọn đơn vị quản lý");

        // Convert date strings if needed, but here assuming they are timestamps
        onSubmit(formData);
    };

    // Helper for date input (YYYY-MM-DD to unix timestamp and vice versa)
    const toDateString = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp * 1000).toISOString().split('T')[0];
    };

    const fromDateString = (dateStr) => {
        if (!dateStr) return 0;
        return Math.floor(new Date(dateStr).getTime() / 1000);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isEdit ? 'Chỉnh sửa công trình' : 'Thêm công trình mới'}
                <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        fullWidth label="Tên công trình" required size="small"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                    <TextField
                        fullWidth select label="Công ty quản lý" required size="small"
                        value={formData.org_id}
                        onChange={(e) => handleChange('org_id', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    >
                        {organizations.map((org) => (
                            <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth select label="Trạng thái" size="small"
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    >
                        <MenuItem value="ongoing">Đang thực hiện</MenuItem>
                        <MenuItem value="completed">Hoàn thành</MenuItem>
                    </TextField>
                    <TextField
                        fullWidth label="Mô tả" size="small" multiline rows={4}
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Hủy</Button>
                <Button variant="contained" onClick={handleSave} color="primary">
                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConstructionDialog;
