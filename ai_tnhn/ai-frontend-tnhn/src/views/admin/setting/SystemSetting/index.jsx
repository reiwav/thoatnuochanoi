import React from 'react';
import {
    Button, Grid, CircularProgress, Typography, Box, useTheme, Stack, Paper
} from '@mui/material';
import { IconSettings, IconDatabase, IconCloudRain, IconCheck } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import useSystemSetting from './hooks/useSystemSetting';

const SystemSetting = () => {
    const theme = useTheme();
    const {
        loading,
        saving,
        source,
        handleSave
    } = useSystemSetting();

    const [selectedSource, setSelectedSource] = React.useState('api');

    React.useEffect(() => {
        if (source) {
            setSelectedSource(source);
        }
    }, [source]);

    return (
        <MainCard
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconSettings size={24} color={theme.palette.primary.main} />
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>Cấu hình hệ thống</Typography>
                </Box>
            }
        >
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress size={32} color="secondary" />
                </Box>
            ) : (
                <Box sx={{ maxWidth: '800px', mx: 'auto', py: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
                        Nguồn dữ liệu mực nước sông hồ
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
                        Lựa chọn nguồn dữ liệu hiện tại để hiển thị trên Dashboard chính, báo cáo tóm tắt của AI Trợ lý và đồng bộ Google Drive.
                    </Typography>

                    <Grid container spacing={3}>
                        {/* Option 1: API thoatnuochanoi.vn */}
                        <Grid item xs={12} sm={6}>
                            <Paper
                                elevation={selectedSource === 'api' ? 4 : 1}
                                onClick={() => setSelectedSource('api')}
                                sx={{
                                    p: 3,
                                    borderRadius: '16px',
                                    border: '2px solid',
                                    borderColor: selectedSource === 'api' ? theme.palette.primary.main : 'divider',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    backgroundColor: selectedSource === 'api' ? 'rgba(33, 150, 243, 0.04)' : '#fff',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                                        borderColor: selectedSource === 'api' ? theme.palette.primary.main : theme.palette.primary.light
                                    }
                                }}
                            >
                                {selectedSource === 'api' && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            width: 40,
                                            height: 40,
                                            background: theme.palette.primary.main,
                                            borderRadius: '0 0 0 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff'
                                        }}
                                    >
                                        <IconCheck size={18} stroke={3} />
                                    </Box>
                                )}
                                <Stack spacing={2}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '12px',
                                            bgcolor: 'rgba(33, 150, 243, 0.12)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: theme.palette.primary.main
                                        }}
                                    >
                                        <IconCloudRain size={28} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                                            API Thoát Nước Hà Nội
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.5 }}>
                                            Lấy dữ liệu mực nước trực tuyến tự động từ API hệ thống ngoài của Công ty Thoát nước Hà Nội (thoatnuochanoi.vn).
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>

                        {/* Option 2: Database Nhân viên nhập */}
                        <Grid item xs={12} sm={6}>
                            <Paper
                                elevation={selectedSource === 'db' ? 4 : 1}
                                onClick={() => setSelectedSource('db')}
                                sx={{
                                    p: 3,
                                    borderRadius: '16px',
                                    border: '2px solid',
                                    borderColor: selectedSource === 'db' ? theme.palette.primary.main : 'divider',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    backgroundColor: selectedSource === 'db' ? 'rgba(33, 150, 243, 0.04)' : '#fff',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                                        borderColor: selectedSource === 'db' ? theme.palette.primary.main : theme.palette.primary.light
                                    }
                                }}
                            >
                                {selectedSource === 'db' && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            width: 40,
                                            height: 40,
                                            background: theme.palette.primary.main,
                                            borderRadius: '0 0 0 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff'
                                        }}
                                    >
                                        <IconCheck size={18} stroke={3} />
                                    </Box>
                                )}
                                <Stack spacing={2}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '12px',
                                            bgcolor: 'rgba(33, 150, 243, 0.12)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: theme.palette.primary.main
                                        }}
                                    >
                                        <IconDatabase size={28} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                                            Dữ liệu Nhân viên nhập
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.5 }}>
                                            Lấy các bản ghi mực nước sông hồ mới nhất do nhân viên tuần tra đo đạc trực tiếp và lưu trữ trong cơ sở dữ liệu.
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
                        <AnimateButton>
                            <Button
                                variant="contained"
                                color="secondary"
                                size="large"
                                onClick={() => handleSave(selectedSource)}
                                disabled={saving || selectedSource === source}
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    boxShadow: theme.shadows[4]
                                }}
                            >
                                {saving ? <CircularProgress size={22} color="inherit" /> : 'Lưu cấu hình'}
                            </Button>
                        </AnimateButton>
                    </Box>
                </Box>
            )}
        </MainCard>
    );
};

export default SystemSetting;
