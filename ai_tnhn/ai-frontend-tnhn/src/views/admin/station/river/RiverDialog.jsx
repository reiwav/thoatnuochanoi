import React, { useState, useEffect } from 'react';
import { TextField, Stack, Grid } from '@mui/material';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';
import StationDialogWrapper from '../shared/StationDialogWrapper';
import StationBaseFields from '../shared/StationBaseFields';

const RiverDialog = ({ open, onClose, onSubmit, station, isEdit, organizations }) => {
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
        Loai: '',
        NguongCanhBao: '',
        ThuTu: 0,
        TrongSoBaoCao: 0
    });

    useEffect(() => {
        if (open) {
            if (isEdit && station) {
                setFormData({
                    TenTram: station.TenTram || '',
                    DiaChi: station.DiaChi || '',
                    Lat: station.Lat || '',
                    Lng: station.Lng || '',
                    Active: station.Active !== undefined ? station.Active : true,
                    org_id: station.org_id || '',
                    shared_org_ids: station.shared_org_ids || [],
                    share_all: station.share_all || false,
                    Loai: station.Loai || '',
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
                    NguongCanhBao: '',
                    ThuTu: 0,
                    TrongSoBaoCao: 0
                });
            }
        }
    }, [open, isEdit, station, user, isCompany]);

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
        const submitData = {
            ...formData,
            NguongCanhBao: formData.NguongCanhBao !== '' ? parseFloat(formData.NguongCanhBao) : 0,
            ThuTu: parseInt(formData.ThuTu) || 0,
            TrongSoBaoCao: parseInt(formData.TrongSoBaoCao) || 0
        };
        onSubmit(submitData);
    };

    return (
        <StationDialogWrapper
            open={open}
            onClose={onClose}
            onSave={handleSave}
            title={`${isEdit ? 'Chỉnh sửa' : 'Thêm mới'} điểm đo mực nước sông`}
            isEdit={isEdit}
        >
            <Stack spacing={2.5}>
                <StationBaseFields
                    formData={formData}
                    handleChange={handleChange}
                    organizations={organizations}
                />

                <TextField
                    fullWidth label="Loại"
                    placeholder="Ví dụ: Sông Nhuệ, Sông Hồng..."
                    value={formData.Loai || ''}
                    onChange={(e) => handleChange('Loai', e.target.value)}
                />

                <TextField
                    fullWidth label="Ngưỡng cảnh báo" type="number"
                    value={formData.NguongCanhBao}
                    onChange={(e) => handleChange('NguongCanhBao', e.target.value)}
                />

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
            </Stack>
        </StationDialogWrapper>
    );
};

export default RiverDialog;
