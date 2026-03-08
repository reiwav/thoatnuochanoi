import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, IconButton, Stack, FormControlLabel, Switch,
    FormControl, InputLabel, Select, MenuItem, CircularProgress
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

const EmployeeDialog = ({ open, onClose, onSubmit, employee, isEdit, organizations = [], defaultOrgId = '', userRole = '' }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        org_id: '',
        active: true
    });

    useEffect(() => {
        if (open) {
            if (isEdit && employee) {
                setFormData({
                    name: employee.name || '',
                    email: employee.email || '',
                    password: '',
                    role: employee.role || 'employee',
                    org_id: employee.org_id || defaultOrgId,
                    active: employee.active !== undefined ? employee.active : true
                });
            } else {
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: 'employee',
                    org_id: defaultOrgId,
                    active: true
                });
            }
        }
    }, [open, isEdit, employee, defaultOrgId]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!formData.name) return toast.error('Vui lòng nhập tên');
        if (!formData.email) return toast.error('Vui lòng nhập email');
        if (userRole !== 'admin_org' && !formData.org_id) return toast.error('Vui lòng chọn công ty');
        if (!isEdit && !formData.password) return toast.error('Vui lòng nhập mật khẩu');
        onSubmit(formData);
    };

    const roleLabels = {
        admin_org: 'Quản lý',
        employee: 'Nhân viên'
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        fullWidth label="Họ và tên" required size="small"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                    />

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={8}>
                            <TextField
                                fullWidth label="Email" required size="small"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                disabled={isEdit}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Vai trò</InputLabel>
                                <Select
                                    value={formData.role}
                                    label="Vai trò"
                                    onChange={(e) => handleChange('role', e.target.value)}
                                    sx={{ borderRadius: '12px', bgcolor: '#f8fafc' }}
                                >
                                    <MenuItem value="admin_org">Quản lý</MenuItem>
                                    <MenuItem value="employee">Nhân viên</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    {/* Org selector dropdown */}
                    {userRole !== 'admin_org' && (
                        <FormControl fullWidth size="small">
                            <InputLabel>Công ty / Xí nghiệp *</InputLabel>
                            <Select
                                value={formData.org_id}
                                label="Công ty / Xí nghiệp *"
                                onChange={(e) => handleChange('org_id', e.target.value)}
                                disabled={!!defaultOrgId} // disable if came from org page
                                sx={{ borderRadius: '12px', bgcolor: defaultOrgId ? '#f0f0f0' : '#f8fafc' }}
                            >
                                {organizations.map((org) => (
                                    <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <TextField
                        fullWidth label="Mật khẩu" required={!isEdit} size="small"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder={isEdit ? 'Để trống nếu không đổi' : ''}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.active}
                                onChange={(e) => handleChange('active', e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Kích hoạt tài khoản"
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

export default EmployeeDialog;
