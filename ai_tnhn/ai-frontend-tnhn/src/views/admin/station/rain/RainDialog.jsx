import React from 'react';
import { TextField, MenuItem, Stack, Grid } from '@mui/material';
import StationDialogWrapper from '../shared/StationDialogWrapper';
import StationBaseFields from '../shared/StationBaseFields';
import useRainDialog from './hooks/useRainDialog';

const RainDialog = ({ open, onClose, onSubmit, station, isEdit, organizations }) => {
    const {
        formData,
        isSuperAdmin,
        handleChange,
        handleSave
    } = useRainDialog({ open, isEdit, station, onClose, onSubmit });

    return (
        <StationDialogWrapper
            open={open}
            onClose={onClose}
            onSave={handleSave}
            title={`${isEdit ? 'Chỉnh sửa' : 'Thêm mới'} trạm đo mưa`}
            isEdit={isEdit}
        >
            <Stack spacing={2.5}>
                <StationBaseFields
                    formData={formData}
                    handleChange={handleChange}
                    organizations={organizations}
                />

                <Grid container spacing={2}>
                    {isSuperAdmin && (
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="ID cũ (old_id)" type="number"
                                value={formData.OldId}
                                onChange={(e) => handleChange('OldId', e.target.value)}
                            />
                        </Grid>
                    )}

                    <Grid item xs={12} sm={isSuperAdmin ? 6 : 12} minWidth={120}>
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
                        </TextField>
                    </Grid>
                </Grid>

                {isSuperAdmin && (
                    <TextField
                        fullWidth label="Tên phường/xã"
                        value={formData.TenPhuong}
                        onChange={(e) => handleChange('TenPhuong', e.target.value)}
                        sx={{ mt: 2 }}
                    />
                )}

                <TextField
                    fullWidth label="Ngưỡng cảnh báo" type="number"
                    value={formData.NguongCanhBao}
                    onChange={(e) => handleChange('NguongCanhBao', e.target.value)}
                />

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={isSuperAdmin ? 6 : 12}>
                        <TextField
                            fullWidth label="Độ ưu tiên" type="number"
                            value={formData.ThuTu}
                            onChange={(e) => handleChange('ThuTu', e.target.value)}
                            helperText="Số nhỏ = ưu tiên cao"
                        />
                    </Grid>
                    {isSuperAdmin && (
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Trọng số báo cáo" type="number"
                                value={formData.TrongSoBaoCao}
                                onChange={(e) => handleChange('TrongSoBaoCao', e.target.value)}
                            />
                        </Grid>
                    )}
                </Grid>
            </Stack>
        </StationDialogWrapper >
    );
};

export default RainDialog;
