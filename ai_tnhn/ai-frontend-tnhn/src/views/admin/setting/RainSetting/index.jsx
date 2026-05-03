import { useState, useEffect } from 'react';
import {
    Button, Grid, TextField, CircularProgress, Typography, Box, useTheme, Stack
} from '@mui/material';
import { IconCloudRain, IconDeviceFloppy } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import settingApi from 'api/setting';

const RainSetting = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sessionID, setSessionID] = useState('');

    const fetchRainSetting = async () => {
        setLoading(true);
        try {
            const response = await settingApi.getRainSetting();
            if (response && response.session_id) {
                setSessionID(response.session_id);
            }
        } catch (err) {
            toast.error('Lỗi lấy dữ liệu cấu hình lượng mưa');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRainSetting();
    }, []);

    const handleSave = async () => {
        if (!sessionID) {
            toast.error('Vui lòng nhập Session ID');
            return;
        }
        setSaving(true);
        try {
            await settingApi.updateRainSetting({ session_id: sessionID });
            toast.success('Lưu cấu hình thành công');
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Lỗi lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

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
