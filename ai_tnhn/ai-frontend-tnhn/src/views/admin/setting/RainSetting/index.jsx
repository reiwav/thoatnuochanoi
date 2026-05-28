import React from 'react';
import {
    Button, Grid, TextField, CircularProgress, Typography, Box, useTheme, Stack
} from '@mui/material';
import { IconCloudRain, IconDeviceFloppy } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import useRainSetting from './hooks/useRainSetting';

const RainSetting = () => {
    const theme = useTheme();
    const {
        loading,
        saving,
        sessionID,
        setSessionID,
        handleSave
    } = useRainSetting();

    return (
        <MainCard
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconCloudRain size={24} color={theme.palette.primary.main} />
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>Cấu hình Rain Worker</Typography>
                </Box>
            }
        >
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress size={32} color="secondary" />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Stack spacing={1}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Session ID (Vrain)</Typography>
                            <TextField
                                fullWidth
                                placeholder="Nhập Session ID lấy từ Vrain"
                                value={sessionID}
                                onChange={(e) => setSessionID(e.target.value)}
                                disabled={saving}
                            />
                            <Typography variant="caption" color="textSecondary">
                                * Session ID dùng để xác thực khi lấy dữ liệu lượng mưa từ API Vrain.
                            </Typography>
                        </Stack>
                    </Grid>
                    <Grid item xs={12}>
                        <AnimateButton>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <IconDeviceFloppy size={18} />}
                                onClick={handleSave}
                                disabled={saving}
                                sx={{ px: 4, py: 1, borderRadius: '8px', fontWeight: 700 }}
                            >
                                {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                            </Button>
                        </AnimateButton>
                    </Grid>
                </Grid>
            )}
        </MainCard>
    );
};

export default RainSetting;
