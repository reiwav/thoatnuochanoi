import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, IconButton, Stack,
    Typography, Box, MenuItem
} from '@mui/material';
import MultiSelectCheckboxes from 'ui-component/MultiSelectCheckboxes';
import { IconX } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';

const ConstructionDialog = ({ open, onClose, onSubmit, item, isEdit, organizations = { primary: [], shared: [] }, defaultOrgId = '' }) => {
    const { hasPermission } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        start_date: 0,
        end_date: 0,
        status: 'planned',
        cost: 0,
        org_id: '',
        shared_org_ids: []
    });

    useEffect(() => {
        if (open) {
            if (isEdit && item) {
                setFormData({
                    name: item.name || '',
                    description: item.description || '',
                    location: item.location || '',
                    start_date: item.start_date || 0,
                    end_date: item.end_date || 0,
                    status: item.status || 'planned',
                    cost: item.cost || 0,
                    org_id: item.org_id || '',
                    shared_org_ids: item.shared_org_ids || []
                });
            } else {
                setFormData({
                    name: '',
                    description: '',
                    location: '',
                    start_date: Math.floor(Date.now() / 1000),
                    end_date: Math.floor(Date.now() / 1000) + 86400 * 30, // Default 30 days
                    status: 'planned',
                    cost: 0,
                    org_id: defaultOrgId || '',
                    shared_org_ids: []
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

        onSubmit(formData);
    };

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
                        fullWidth label="Vị trí" size="small"
                        value={formData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    />
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth label="Ngày khởi công" type="date" size="small"
                                InputLabelProps={{ shrink: true }}
                                value={toDateString(formData.start_date)}
                                onChange={(e) => handleChange('start_date', fromDateString(e.target.value))}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth label="Ngày hoàn thành dự kiến" type="date" size="small"
                                InputLabelProps={{ shrink: true }}
                                value={toDateString(formData.end_date)}
                                onChange={(e) => handleChange('end_date', fromDateString(e.target.value))}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </Grid>
                    </Grid>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth select label="Trạng thái" size="small"
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            >
                                <MenuItem value="planned">Dự kiến</MenuItem>
                                <MenuItem value="ongoing">Đang thi công</MenuItem>
                                <MenuItem value="completed">Hoàn thành</MenuItem>
                                <MenuItem value="suspended">Tạm dừng</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth label="Kinh phí (VNĐ)" type="number" size="small"
                                value={formData.cost}
                                onChange={(e) => handleChange('cost', parseInt(e.target.value) || 0)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </Grid>
                    </Grid>

                    <TextField
                        fullWidth select label="Đơn vị quản lý" required size="small"
                        value={formData.org_id}
                        onChange={(e) => handleChange('org_id', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                    >
                        {(organizations.primary || []).map((org) => (
                            <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                        ))}
                    </TextField>

                    <MultiSelectCheckboxes
                        label="Đơn vị phối hợp"
                        placeholder="Chọn đơn vị"
                        options={(organizations.shared || []).filter((org) => org.id !== formData.org_id)}
                        value={formData.shared_org_ids}
                        onChange={(ids) => handleChange('shared_org_ids', ids)}
                        size="small"
                    />

                    <TextField
                        fullWidth label="Mô tả" size="small" multiline rows={3}
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
