import React, { useState, useEffect } from 'react'; // v2 - for cache busting
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, IconButton, Stack, FormControlLabel, Switch,
    FormControl, InputLabel, Select, MenuItem, Typography
} from '@mui/material';
import MultiSelectCheckboxes from 'ui-component/MultiSelectCheckboxes';
import { IconX } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

import useAuthStore from 'store/useAuthStore';

const StationDialog = ({ open, onClose, onSubmit, station, isEdit, type, organizations = { primary: [], shared: [] } }) => {
    const { user, isCompany } = useAuthStore();
    const [formData, setFormData] = useState({
        TenTram: '',
        DiaChi: '',
        Lat: '',
        Lng: '',
        Active: true,
        org_id: '',
        shared_org_ids: [],
        share_all: false,
        // Specific for Lake/River
        Loai: '',
        TenTramHTML: '',
        NguongCanhBao: '',
        ThuTu: 0,
        TrongSoBaoCao: 0
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
                    org_id: station.org_id || '',
                    shared_org_ids: station.shared_org_ids || [],
                    share_all: station.share_all || false,
                    Loai: station.Loai || '',
                    TenTramHTML: station.TenTramHTML || '',
                    NguongCanhBao: station.NguongCanhBao !== undefined ? station.NguongCanhBao : '',
                    ThuTu: station.ThuTu !== undefined ? station.ThuTu : 0,
                    TrongSoBaoCao: station.TrongSoBaoCao !== undefined ? station.TrongSoBaoCao : 0
                });
            } else {
                setFormData({
                    TenTram: '',
                    DiaChi: '',
                    Lat: '',
                    Lng: '',
                    Active: true,
                    org_id: isCompany ? '' : (user?.org_id || ''),
                    shared_org_ids: [],
                    share_all: false,
                    Loai: '',
                    TenTramHTML: '',
                    NguongCanhBao: '',
                    ThuTu: 0,
                    TrongSoBaoCao: 0
                });
            }
        }
    }, [open, isEdit, station]);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            if (field === 'share_all' && value === true) {
                newData.shared_org_ids = [];
            }
            return newData;
        });
    };

    const handleSave = () => {
        if (!formData.TenTram) return toast.error('Vui lòng nhập tên trạm');

        // For Inundation points, backend uses name/address/lat/lng (lowercase)
        // For Rain/Lake/River, backend uses TenTram/DiaChi/Lat/Lng (TitleCase)
        // We'll normalize in the onSubmit or handle here
        const submitData = { ...formData };
        if (type !== 'inundation') {
            submitData.NguongCanhBao = submitData.NguongCanhBao !== '' ? parseFloat(submitData.NguongCanhBao) : 0;
            submitData.ThuTu = parseInt(submitData.ThuTu) || 0;
            submitData.TrongSoBaoCao = parseInt(submitData.TrongSoBaoCao) || 0;
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

                    <TextField
                        select
                        fullWidth
                        label="Đơn vị quản lý"
                        required
                        value={formData.org_id}
                        onChange={(e) => handleChange('org_id', e.target.value)}

                    >
                        <MenuItem value="">Chọn đơn vị quản lý</MenuItem>
                        {(organizations.primary || []).map((org) => (
                            <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                        ))}
                    </TextField>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.share_all}
                                onChange={(e) => handleChange('share_all', e.target.checked)}
                                color="secondary"
                            />
                        }
                        label={<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Chia sẻ với tất cả xí nghiệp</Typography>}
                    />

                    {!formData.share_all && (
                        <MultiSelectCheckboxes
                            label="Xí nghiệp phối hợp"
                            placeholder="Chọn xí nghiệp"
                            options={(organizations.shared || []).filter((org) => org.id !== formData.org_id)}
                            value={formData.shared_org_ids}
                            onChange={(ids) => handleChange('shared_org_ids', ids)}
                            sx={{
                                '& .MuiAutocomplete-tag': {
                                    m: 0.5
                                }
                            }}
                        />
                    )}

                    {type === 'rain' && (
                        <TextField
                            select
                            fullWidth
                            label="Thuộc (Xã/Phường)"
                            value={formData.Loai || ''}
                            onChange={(e) => handleChange('Loai', e.target.value)}
                        >
                            <MenuItem value="">Chọn</MenuItem>
                            <MenuItem value="phuong">Phường</MenuItem>
                            <MenuItem value="xa">Xã</MenuItem>
                            {/* <MenuItem value="thitran">Thị trấn</MenuItem> */}
                        </TextField>
                    )}

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

                    {type !== 'inundation' && (
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth label="Độ ưu tiên" type="number"
                                    value={formData.ThuTu}
                                    onChange={(e) => handleChange('ThuTu', e.target.value)}
                                    helperText="Số nhỏ = ưu tiên cao"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth label="Trọng số báo cáo" type="number"
                                    value={formData.TrongSoBaoCao}
                                    onChange={(e) => handleChange('TrongSoBaoCao', e.target.value)}
                                />
                            </Grid>
                        </Grid>
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
