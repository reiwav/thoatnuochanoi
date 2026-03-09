import React, { useState, useEffect } from 'react'; // v2 - for cache busting
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, IconButton, Stack, FormControlLabel, Switch,
    FormControl, InputLabel, Select, MenuItem, Typography
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
        TenTramHTML: '',
        NguongCanhBao: ''
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
                    TenTramHTML: station.TenTramHTML || '',
                    NguongCanhBao: station.NguongCanhBao !== undefined ? station.NguongCanhBao : ''
                });
            } else {
                setFormData({
                    TenTram: '',
                    DiaChi: '',
                    Lat: '',
                    Lng: '',
                    Active: true,
                    Loai: '',
                    TenTramHTML: '',
                    NguongCanhBao: ''
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
        const submitData = { ...formData };
        if (type !== 'inundation') {
            submitData.NguongCanhBao = submitData.NguongCanhBao !== '' ? parseFloat(submitData.NguongCanhBao) : 0;
        }

        onSubmit(submitData);
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
            <DialogTitle sx={{ variant: 'h3', fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 2, pb: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 900 }}>{getTitle()}</Typography>
                <IconButton onClick={onClose} size="small"><IconX size={24} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 2 }}>
                <Stack spacing={2.5} sx={{
                    mt: 1,
                    '& .MuiInputLabel-root': { fontSize: '1rem', fontWeight: 600 },
                    '& .MuiInputBase-input': { fontSize: '1rem' },
                    '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' }
                }}>
                    <TextField
                        fullWidth label="Tên trạm / Điểm" required
                        value={formData.TenTram}
                        onChange={(e) => handleChange('TenTram', e.target.value)}
                    />

                    <TextField
                        fullWidth label="Địa chỉ"
                        value={formData.DiaChi}
                        onChange={(e) => handleChange('DiaChi', e.target.value)}
                    />

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Vĩ độ (Lat)"
                                value={formData.Lat}
                                onChange={(e) => handleChange('Lat', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Kinh độ (Lng)"
                                value={formData.Lng}
                                onChange={(e) => handleChange('Lng', e.target.value)}
                            />
                        </Grid>
                    </Grid>

                    {(type === 'lake' || type === 'river') && (
                        <TextField
                            fullWidth label="Loại"
                            value={formData.Loai}
                            onChange={(e) => handleChange('Loai', e.target.value)}
                        />
                    )}

                    {type !== 'inundation' && (
                        <TextField
                            fullWidth label="Ngưỡng cảnh báo" type="number"
                            value={formData.NguongCanhBao}
                            onChange={(e) => handleChange('NguongCanhBao', e.target.value)}
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
                        label={<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Trạng thái hoạt động</Typography>}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700, fontSize: '1rem' }}>Hủy</Button>
                <Button variant="contained" onClick={handleSave} color="primary" sx={{ px: 3, fontWeight: 700, fontSize: '1rem', borderRadius: 2 }}>
                    {isEdit ? 'Cập nhật' : 'Thêm mới'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default StationDialog;
