import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, IconButton, Stack, FormControlLabel, Switch,
    FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

const StationDialog = ({ open, onClose, onSubmit, station, isEdit, type }) => {
    const [formData, setFormData] = useState({
        TenTram: '',
        DiaChi: '',
        Lat: '',
        Lng: '',
        Active: true,
        // Specific for Lake/River
        Loai: '',
        TenTramHTML: ''
    });

    useEffect(() => {
        if (open) {
            if (isEdit && station) {
                setFormData({
                    TenTram: station.TenTram || station.name || '',
                    DiaChi: station.DiaChi || station.address || '',
                    Lat: station.Lat || station.lat || '',
                    Lng: station.Lng || station.lng || '',
                    Active: station.Active !== undefined ? station.Active : (station.active !== undefined ? station.active : true),
                    Loai: station.Loai || '',
                    TenTramHTML: station.TenTramHTML || ''
                });
            } else {
                setFormData({
                    TenTram: '',
                    DiaChi: '',
                    Lat: '',
                    Lng: '',
                    Active: true,
                    Loai: '',
                    TenTramHTML: ''
                });
            }
        }
    }, [open, isEdit, station]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!formData.TenTram) return toast.error('Vui lòng nhập tên trạm');

        // For Inundation points, backend uses name/address/lat/lng (lowercase)
        // For Rain/Lake/River, backend uses TenTram/DiaChi/Lat/Lng (TitleCase)
        // We'll normalize in the onSubmit or handle here
        onSubmit(formData);
    };

    const getTitle = () => {
        const action = isEdit ? 'Chỉnh sửa' : 'Thêm mới';
        switch (type) {
            case 'rain': return `${action} điểm đo mưa`;
            case 'lake': return `${action} điểm đo mực nước hồ`;
            case 'river': return `${action} điểm đo mực nước sông`;
            case 'inundation': return `${action} điểm ngập úng`;
            default: return `${action} trạm đo`;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {getTitle()}
                <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        fullWidth label="Tên trạm / Điểm" required size="small"
                        value={formData.TenTram}
                        onChange={(e) => handleChange('TenTram', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                    />

                    <TextField
                        fullWidth label="Địa chỉ" size="small"
                        value={formData.DiaChi}
                        onChange={(e) => handleChange('DiaChi', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                    />

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Vĩ độ (Lat)" size="small"
                                value={formData.Lat}
                                onChange={(e) => handleChange('Lat', e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Kinh độ (Lng)" size="small"
                                value={formData.Lng}
                                onChange={(e) => handleChange('Lng', e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                            />
                        </Grid>
                    </Grid>

                    {(type === 'lake' || type === 'river') && (
                        <TextField
                            fullWidth label="Loại" size="small"
                            value={formData.Loai}
                            onChange={(e) => handleChange('Loai', e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                        />
                    )}

                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.Active}
                                onChange={(e) => handleChange('Active', e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Trạng thái hoạt động"
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

export default StationDialog;
