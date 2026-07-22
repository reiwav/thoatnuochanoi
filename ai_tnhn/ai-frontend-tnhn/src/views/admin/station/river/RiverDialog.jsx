import React from 'react';
import { TextField, Stack, Grid } from '@mui/material';
import StationDialogWrapper from '../shared/StationDialogWrapper';
import StationBaseFields from '../shared/StationBaseFields';
import ThresholdConfigsField from '../shared/ThresholdConfigsField';
import useRiverDialog from './hooks/useRiverDialog';

const RiverDialog = ({ open, onClose, onSubmit, station, isEdit, organizations }) => {
    const {
        formData,
        isSuperAdmin,
        handleChange,
        handleSave
    } = useRiverDialog({ open, isEdit, station, onClose, onSubmit });

    return (
        <StationDialogWrapper
            open={open}
            onClose={onClose}
            onSave={handleSave}
            title={`${isEdit ? 'Chỉnh sửa' : 'Thêm mới'} điểm đo mực nước sông`}
            isEdit={isEdit}
            maxWidth="lg"
        >
            <Grid container spacing={3} alignItems="flex-start">
                {/* Cột trái: Thông tin cơ bản trạm */}
                <Grid item xs={12} sm={6}>
                    <Stack spacing={2.5}>
                        <StationBaseFields
                            formData={formData}
                            handleChange={handleChange}
                            organizations={organizations}
                        />

                        {isSuperAdmin && (
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth size="small" label="ID cũ (old_id)" type="number"
                                        value={formData.OldId}
                                        onChange={(e) => handleChange('OldId', e.target.value)}
                                        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth size="small" label="Tên phường/xã"
                                        value={formData.TenPhuong}
                                        onChange={(e) => handleChange('TenPhuong', e.target.value)}
                                    />
                                </Grid>
                            </Grid>
                        )}

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth size="small" label="Loại sông"
                                    placeholder="Ví dụ: Sông Nhuệ, Sông Hồng..."
                                    value={formData.Loai || ''}
                                    onChange={(e) => handleChange('Loai', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth size="small" label="Ngưỡng cảnh báo mặc định" type="number"
                                    value={formData.NguongCanhBao}
                                    onChange={(e) => handleChange('NguongCanhBao', e.target.value)}
                                    slotProps={{ htmlInput: { inputMode: 'decimal', step: 'any' } }}
                                />
                            </Grid>
                        </Grid>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={isSuperAdmin ? 6 : 12}>
                                <TextField
                                    fullWidth size="small" label="Độ ưu tiên" type="number"
                                    value={formData.ThuTu}
                                    onChange={(e) => handleChange('ThuTu', e.target.value)}
                                    helperText="Số nhỏ = ưu tiên cao"
                                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                                />
                            </Grid>
                            {isSuperAdmin && (
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth size="small" label="Trọng số báo cáo" type="number"
                                        value={formData.TrongSoBaoCao}
                                        onChange={(e) => handleChange('TrongSoBaoCao', e.target.value)}
                                        slotProps={{ htmlInput: { inputMode: 'decimal', step: 'any' } }}
                                    />
                                </Grid>
                            )}
                        </Grid>
                    </Stack>
                </Grid>

                {/* Cột phải: Phương thức thu thập & Ngưỡng mùa */}
                <Grid item xs={12} sm={6}>
                    <ThresholdConfigsField
                        formData={formData}
                        handleChange={handleChange}
                    />
                </Grid>
            </Grid>
        </StationDialogWrapper>
    );
};

export default RiverDialog;
