import React from 'react';
import { TextField, Stack, Grid } from '@mui/material';
import StationDialogWrapper from '../shared/StationDialogWrapper';
import StationBaseFields from '../shared/StationBaseFields';
import useLakeDialog from './hooks/useLakeDialog';

const LakeDialog = ({ open, onClose, onSubmit, station, isEdit, organizations }) => {
    const {
        formData,
        isSuperAdmin,
        handleChange,
        handleSave
    } = useLakeDialog({ open, isEdit, station, onClose, onSubmit });

    return (
        <StationDialogWrapper
            open={open}
            onClose={onClose}
            onSave={handleSave}
            title={`${isEdit ? 'Chỉnh sửa' : 'Thêm mới'} điểm đo mực nước hồ`}
            isEdit={isEdit}
        >
            <Stack spacing={2.5}>
                <StationBaseFields
                    formData={formData}
                    handleChange={handleChange}
                    organizations={organizations}
                />

                {isSuperAdmin && (
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth label="ID cũ (old_id)" type="number"
                                value={formData.OldId}
                                onChange={(e) => handleChange('OldId', e.target.value)}
                                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth label="Tên phường/xã"
                                value={formData.TenPhuong}
                                onChange={(e) => handleChange('TenPhuong', e.target.value)}
                            />
                        </Grid>
                    </Grid>
                )}

                <TextField
                    fullWidth label="Loại"
                    placeholder="Ví dụ: Hồ Tây, Hồ Gươm..."
                    value={formData.Loai || ''}
                    onChange={(e) => handleChange('Loai', e.target.value)}
                />

                <TextField
                    fullWidth label="Ngưỡng cảnh báo" type="number"
                    value={formData.NguongCanhBao}
                    onChange={(e) => handleChange('NguongCanhBao', e.target.value)}
                    slotProps={{ htmlInput: { inputMode: 'decimal', step: 'any' } }}
                />

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={isSuperAdmin ? 6 : 12}>
                        <TextField
                            fullWidth label="Độ ưu tiên" type="number"
                            value={formData.ThuTu}
                            onChange={(e) => handleChange('ThuTu', e.target.value)}
                            helperText="Số nhỏ = ưu tiên cao"
                            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                        />
                    </Grid>
                    {isSuperAdmin && (
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="Trọng số báo cáo" type="number"
                                value={formData.TrongSoBaoCao}
                                onChange={(e) => handleChange('TrongSoBaoCao', e.target.value)}
                                slotProps={{ htmlInput: { inputMode: 'decimal', step: 'any' } }}
                            />
                        </Grid>
                    )}
                </Grid>
            </Stack>
        </StationDialogWrapper>
    );
};

export default LakeDialog;
