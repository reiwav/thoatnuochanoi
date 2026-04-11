import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, IconButton, Stack, FormControlLabel, Switch,
    Typography, Box, Checkbox, Divider, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment, MenuItem
} from '@mui/material';
import { IconX, IconSearch, IconChevronRight, IconClipboardCheck } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import stationApi from 'api/station';

// Sub-component for station selection in a table
const OrganizationDialog = ({ open, onClose, onSubmit, organization, isEdit }) => {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        status: true,
        address: '',
        phone_number: '',
        email: '',
        representative: '',
        order: ''
    });

    useEffect(() => {
        if (open) {
            if (isEdit && organization) {
                setFormData({
                    name: organization.name || '',
                    code: organization.code || '',
                    description: organization.description || '',
                    status: organization.status !== undefined ? organization.status : true,
                    address: organization.address || '',
                    phone_number: organization.phone_number || '',
                    email: organization.email || '',
                    representative: organization.representative || '',
                    order: organization.order || ''
                });
            } else {
                setFormData({
                    name: '',
                    code: '',
                    description: '',
                    status: true,
                    address: '',
                    phone_number: '',
                    email: '',
                    representative: '',
                    order: ''
                });
            }
        }
    }, [open, isEdit, organization]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        if (!formData.name) return toast.error("Vui lòng nhập Tên đơn vị");
        if (!formData.code) return toast.error("Vui lòng nhập mã đơn vị");
        if (!formData.phone_number) return toast.error("Vui lòng nhập số điện thoại");
        if (!formData.email) return toast.error("Vui lòng nhập email");

        onSubmit(formData);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isEdit ? 'Chỉnh sửa đơn vị' : 'Thêm đơn vị mới'}
                <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={3} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} sm={6}>
                        <Stack spacing={2.5}>
                            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
                                Thông tin cơ bản
                            </Typography>
                            <TextField
                                fullWidth label="Tên đơn vị" required size="small"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                            />
                            <TextField
                                fullWidth label="Mã đơn vị" required size="small"
                                value={formData.code}
                                onChange={(e) => handleChange('code', e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                            />
                            <TextField
                                fullWidth label="Người đại diện" size="small"
                                value={formData.representative}
                                onChange={(e) => handleChange('representative', e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                            />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth label="SĐT liên hệ" required size="small"
                                        value={formData.phone_number}
                                        onChange={(e) => handleChange('phone_number', e.target.value)}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth label="Email" required size="small"
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                                    />
                                </Grid>
                            </Grid>
                        </Stack>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Stack spacing={2.5}>
                            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
                                Địa chỉ & Cấu hình
                            </Typography>
                            <TextField
                                fullWidth label="Địa chỉ" size="small"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                            />
                            <TextField
                                select fullWidth label="Lệnh số" value={formData.order}
                                onChange={(e) => handleChange('order', e.target.value)}
                                size="small"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><IconClipboardCheck size={18} style={{ color: '#64748b' }} /></InputAdornment>,
                                }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                            >
                                {[...Array(100)].map((_, i) => (
                                    <MenuItem key={i + 1} value={`Lệnh ${i + 1}`}>Lệnh {i + 1}</MenuItem>
                                ))}
                            </TextField>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.status}
                                        onChange={(e) => handleChange('status', e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Kích hoạt hoạt động"
                                sx={{ ml: 0 }}
                            />

                            <Divider sx={{ my: 0.5 }} />

                            <TextField
                                fullWidth label="Mô tả / Ghi chú" size="small"
                                multiline rows={3.5}
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                            />
                        </Stack>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
                <Button onClick={onClose} color="inherit" sx={{ borderRadius: '8px' }}>Hủy</Button>
                <Button variant="contained" onClick={handleSave} color="primary" sx={{ borderRadius: '8px', px: 4 }}>
                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OrganizationDialog;
