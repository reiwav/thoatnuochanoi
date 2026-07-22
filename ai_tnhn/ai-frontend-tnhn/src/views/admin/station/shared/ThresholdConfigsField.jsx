import React from 'react';
import {
    Box, Typography, Grid, TextField, RadioGroup, FormControlLabel, Radio,
    Card, Stack, CircularProgress, Chip
} from '@mui/material';
import { IconRipple } from '@tabler/icons-react';
import useThresholdConfigsField from './hooks/useThresholdConfigsField';

const ThresholdConfigsField = ({ formData, handleChange }) => {
    const {
        activeSetting,
        loading,
        handleThresholdChange,
        getThresholdVal
    } = useThresholdConfigsField({ formData, handleChange });

    return (
        <Card sx={{ p: 2.5, border: '1px solid', borderColor: 'primary.light', borderRadius: '12px', bgcolor: 'background.paper' }}>
            <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconRipple size={22} />
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Phương thức dữ liệu & Cấu hình ngưỡng mực nước theo mùa
                    </Typography>
                </Stack>

                {/* Data Mode Switcher */}
                <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'action.hover' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Phương thức thu thập dữ liệu:
                    </Typography>
                    <RadioGroup
                        row
                        value={formData.data_mode || 'manual'}
                        onChange={(e) => {
                            const mode = e.target.value;
                            handleChange('data_mode', mode);
                            handleChange('is_auto', mode === 'auto');
                        }}
                    >
                        <FormControlLabel value="manual" control={<Radio color="primary" />} label="✍️ Nhập dữ liệu thủ công (Manual)" />
                        <FormControlLabel value="auto" control={<Radio color="primary" />} label="🤖 Tự động từ trạm đo (Auto)" />
                    </RadioGroup>
                </Box>

                {/* Dynamic Threshold Inputs based on Active Setting */}
                {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">Đang tải ngưỡng cấu hình mùa active...</Typography>
                    </Box>
                ) : (
                    <Box>
                        <Stack spacing={2}>
                            {activeSetting ? (
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Chip label={`Bản ghi Active v${activeSetting.version}`} color="success" size="small" sx={{ fontWeight: 700 }} />
                                    <Typography variant="caption" color="textSecondary">
                                        Năm {activeSetting.year}: {activeSetting.name}
                                    </Typography>
                                </Stack>
                            ) : (
                                <Chip label="Mặc định hệ thống" color="default" size="small" sx={{ fontWeight: 600, width: 'fit-content' }} />
                            )}

                            {(activeSetting?.thresholds || [
                                { type: 'mua_kho', name: 'Mùa khô', months: [1, 2, 3, 4, 11, 12] },
                                { type: 'mua_mua', name: 'Mùa mưa', months: [5, 6, 7, 8, 9, 10] }
                            ]).map((th, idx) => (
                                <Box key={idx} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
                                    <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                                        Ngưỡng mực nước {th.name} ({th.type === 'mua_kho' ? 'Mùa khô: T' + th.months?.join(', T') : 'Mùa mưa: T' + th.months?.join(', T')}):
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                label={`Ngưỡng cạn/thấp (Min) - ${th.name}`}
                                                placeholder="VD: 1.5"
                                                value={getThresholdVal(th.type, 'min_level')}
                                                onChange={(e) => handleThresholdChange(th.type, 'min_level', e.target.value)}
                                                slotProps={{ htmlInput: { step: 'any' } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                label={`Ngưỡng cao/báo động (Max) - ${th.name}`}
                                                placeholder="VD: 4.0"
                                                value={getThresholdVal(th.type, 'max_level')}
                                                onChange={(e) => handleThresholdChange(th.type, 'max_level', e.target.value)}
                                                slotProps={{ htmlInput: { step: 'any' } }}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Stack>
        </Card>
    );
};

export default ThresholdConfigsField;
