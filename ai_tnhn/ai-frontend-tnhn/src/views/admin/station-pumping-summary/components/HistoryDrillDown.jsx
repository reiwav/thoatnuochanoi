import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Stack, IconButton, CircularProgress, 
    Paper, alpha, useTheme, Pagination, Chip, Avatar
} from '@mui/material';
import { 
    IconArrowLeft, IconUser, IconClock, IconMessage2 
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import pumpingStationApi from 'api/pumpingStation';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';

const HistoryDrillDown = ({ station, onBack }) => {
    const theme = useTheme();
    const [history, setHistory] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const perPage = 10;

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await (station.pump_count !== undefined 
                ? pumpingStationApi.getHistory(station.id, { page, per_page: perPage })
                : wastewaterTreatmentApi.getHistory(station.id, { page, per_page: perPage }));
            
            if (res && res.data) {
                setHistory(res.data);
                setTotal(res.total || 0);
            } else if (Array.isArray(res)) {
                setHistory(res);
                setTotal(res.length);
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [station.id, page]);

    return (
        <Box sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
                <IconButton 
                    onClick={onBack} 
                    sx={{ 
                        bgcolor: 'background.paper', 
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        '&:hover': { bgcolor: 'primary.lighter', color: 'primary.main' } 
                    }}
                >
                    <IconArrowLeft size={22} />
                </IconButton>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: -0.5 }}>
                        {station.name}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconClock size={14} /> Lịch sử báo cáo vận hành
                    </Typography>
                </Box>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12, gap: 2 }}>
                    <CircularProgress size={40} thickness={4} />
                    <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 700 }}>Đang tải lịch sử...</Typography>
                </Box>
            ) : (
                <Stack spacing={3}>
                    {history.length > 0 ? (
                        history.map((item, index) => (
                            <Box key={item.id || index} sx={{ position: 'relative' }}>
                                {/* Date and User Header */}
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, px: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.08), px: 1.5, py: 0.5, borderRadius: 2 }}>
                                        {dayjs(item.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                    </Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.200', color: 'grey.700', fontSize: '0.75rem' }}>
                                            <IconUser size={14} />
                                        </Avatar>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>
                                            {item.user_name}
                                        </Typography>
                                    </Stack>
                                </Stack>

                                {/* Message Bubble */}
                                <Paper 
                                    elevation={0}
                                    sx={{ 
                                        p: 2.5, 
                                        bgcolor: 'background.paper', 
                                        borderRadius: 4, 
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        position: 'relative',
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            borderColor: 'primary.light',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
                                        }
                                    }}
                                >
                                    {station.pump_count !== undefined && (
                                        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                                            <Chip 
                                                label={`VẬN HÀNH: ${item.operating_count}`} 
                                                size="small" 
                                                color="success" 
                                                variant="filled"
                                                sx={{ fontWeight: 900, borderRadius: 1.5, fontSize: '0.65rem' }} 
                                            />
                                            <Chip 
                                                label={`DỪNG: ${item.closed_count}`} 
                                                size="small" 
                                                color="error" 
                                                sx={{ fontWeight: 900, borderRadius: 1.5, fontSize: '0.65rem' }} 
                                            />
                                        </Stack>
                                    )}
                                    
                                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                        <IconMessage2 size={20} color={theme.palette.text.disabled} style={{ marginTop: 2 }} />
                                        <Typography 
                                            variant="body1" 
                                            sx={{ 
                                                color: 'text.primary', 
                                                lineHeight: 1.6, 
                                                fontWeight: 500,
                                                fontSize: '0.95rem'
                                            }}
                                        >
                                            {item.note || 'Không có ghi chú vận hành'}
                                        </Typography>
                                    </Stack>
                                </Paper>
                            </Box>
                        ))
                    ) : (
                        <Paper sx={{ py: 12, textAlign: 'center', borderRadius: 4, border: '1px dashed', borderColor: 'divider', bgcolor: 'grey.50' }}>
                            <IconMessage2 size={48} color={theme.palette.text.disabled} style={{ marginBottom: 16 }} />
                            <Typography color="text.secondary" variant="h4" sx={{ fontWeight: 800 }}>Chưa có bản tin nào</Typography>
                            <Typography variant="body2" color="text.disabled">Lịch sử vận hành của trạm sẽ được hiển thị tại đây</Typography>
                        </Paper>
                    )}
                </Stack>
            )}

            {total > perPage && (
                <Box sx={{ mt: 5, display: 'flex', justifyContent: 'center' }}>
                    <Pagination 
                        count={Math.ceil(total / perPage)} 
                        page={page} 
                        onChange={(e, v) => setPage(v)} 
                        color="primary" 
                        variant="outlined"
                        shape="rounded"
                        size="large" 
                    />
                </Box>
            )}
        </Box>
    );
};

export default HistoryDrillDown;
