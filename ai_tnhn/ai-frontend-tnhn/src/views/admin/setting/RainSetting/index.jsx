import React from 'react';
import {
    Button, Grid, TextField, CircularProgress, Typography, Box, useTheme, Stack
} from '@mui/material';
import { IconCloudRain, IconDeviceFloppy, IconTrash } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import useRainSetting from './hooks/useRainSetting';

const RainSetting = () => {
    const theme = useTheme();
    const consoleRef = React.useRef(null);
    const {
        loading,
        saving,
        sessionID,
        setSessionID,
        handleSave,
        isSyncing,
        logs,
        handleSync,
        clearLogs
    } = useRainSetting();

    React.useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs]);

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
                <Grid container spacing={3} alignItems="stretch">
                    {/* Cột bên trái: Cấu hình kết nối */}
                    <Grid item xs={12} md={6}>
                        <MainCard title="Cấu hình kết nối Vrain" sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
                            <Stack spacing={2.5}>
                                <Stack spacing={1}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Session ID (Vrain)</Typography>
                                    <TextField
                                        fullWidth
                                        placeholder="Nhập Session ID lấy từ Vrain"
                                        value={sessionID}
                                        onChange={(e) => setSessionID(e.target.value)}
                                        disabled={saving || isSyncing}
                                    />
                                    <Typography variant="caption" color="textSecondary">
                                        * Session ID dùng để xác thực khi lấy dữ liệu lượng mưa từ API Vrain.
                                    </Typography>
                                </Stack>
                                <Box sx={{ display: 'flex' }}>
                                    <AnimateButton>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <IconDeviceFloppy size={18} />}
                                            onClick={handleSave}
                                            disabled={saving || isSyncing}
                                            sx={{ px: 3, py: 1.2, borderRadius: '8px', fontWeight: 700 }}
                                        >
                                            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                                        </Button>
                                    </AnimateButton>
                                </Box>
                            </Stack>
                        </MainCard>
                    </Grid>

                    {/* Cột bên phải: Console Log */}
                    <Grid item xs={12} md={6}>
                        <MainCard 
                            title="Nhật ký hoạt động" 
                            secondary={
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, whiteSpace: 'nowrap' }}>
                                        <Box sx={{ 
                                            width: 8, 
                                            height: 8, 
                                            borderRadius: '50%', 
                                            bgcolor: isSyncing ? '#27c93f' : '#8e8e8e',
                                            animation: isSyncing ? 'pulse 1.5s infinite' : 'none',
                                            '@keyframes pulse': {
                                                '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(39, 201, 63, 0.7)' },
                                                '70%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(39, 201, 63, 0)' },
                                                '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(39, 201, 63, 0)' }
                                            }
                                        }} />
                                        <Typography variant="body2" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'inline-block' }, whiteSpace: 'nowrap' }}>
                                            {isSyncing ? 'Đang chạy' : 'Sẵn sàng'}
                                        </Typography>
                                    </Box>
                                    <AnimateButton>
                                        <Button
                                            variant="contained"
                                            color="secondary"
                                            size="small"
                                            startIcon={isSyncing ? <CircularProgress size={14} color="inherit" /> : <IconCloudRain size={16} />}
                                            onClick={handleSync}
                                            disabled={saving || isSyncing}
                                            sx={{ px: 1.5, py: 0.8, borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}
                                        >
                                            {isSyncing ? 'Đang chạy...' : 'Đồng bộ'}
                                        </Button>
                                    </AnimateButton>
                                    <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="error" 
                                        startIcon={<IconTrash size={16} />}
                                        onClick={clearLogs} 
                                        disabled={isSyncing} 
                                        sx={{ fontWeight: 600, borderRadius: '6px', whiteSpace: 'nowrap' }}
                                    >
                                        Xóa log
                                    </Button>
                                </Stack>
                            }
                            sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}
                        >
                            {/* Mac Window Terminal Emulator */}
                            <Box sx={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #333', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                                {/* Terminal Title Bar */}
                                <Box sx={{
                                    bgcolor: '#252526',
                                    px: 2,
                                    py: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: '1px solid #1e1e1e'
                                }}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f56' }} />
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#27c93f' }} />
                                    </Box>
                                    <Typography variant="caption" sx={{ color: '#8e8e8e', fontWeight: 600, fontFamily: 'monospace' }}>
                                        rain-worker-sync.log
                                    </Typography>
                                    <Box sx={{ width: 36 }} />
                                </Box>

                                {/* Terminal Content */}
                                <Box
                                    ref={consoleRef}
                                    sx={{
                                        bgcolor: '#1e1e1e',
                                        color: '#f8f8f2',
                                        p: 2,
                                        height: '380px',
                                        overflowY: 'auto',
                                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                        fontSize: '0.85rem',
                                        lineHeight: 1.6,
                                        '&::-webkit-scrollbar': {
                                            width: '8px'
                                        },
                                        '&::-webkit-scrollbar-track': {
                                            bgcolor: '#1e1e1e'
                                        },
                                        '&::-webkit-scrollbar-thumb': {
                                            bgcolor: '#444',
                                            borderRadius: '4px'
                                        },
                                        '&::-webkit-scrollbar-thumb:hover': {
                                            bgcolor: '#555'
                                        }
                                    }}
                                >
                                    {logs.length === 0 ? (
                                        <Typography variant="body2" sx={{ color: '#888', fontStyle: 'italic', fontFamily: 'inherit' }}>
                                            Chưa có dữ liệu log. Nhấn nút "Đồng bộ ngay" ở trên để bắt đầu.
                                        </Typography>
                                    ) : (
                                        logs.map((log, idx) => {
                                            let logColor = '#f8f8f2';
                                            if (log.type === 'success') logColor = '#50fa7b';
                                            else if (log.type === 'error') logColor = '#ff5555';
                                            else if (log.type === 'info') logColor = '#8be9fd';
                                            else if (log.type === 'done') logColor = '#f1fa8c';
                                            
                                            return (
                                                <Box key={idx} sx={{ display: 'flex', mb: 0.5, alignItems: 'flex-start' }}>
                                                    <Box sx={{ color: '#6272a4', mr: 1, select: 'none', flexShrink: 0 }}>
                                                        [{log.time}]
                                                    </Box>
                                                    <Box sx={{ color: logColor, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                        {log.text}
                                                    </Box>
                                                </Box>
                                            );
                                        })
                                    )}
                                </Box>
                            </Box>
                        </MainCard>
                    </Grid>
                </Grid>
            )}
        </MainCard>
    );
};

export default RainSetting;
