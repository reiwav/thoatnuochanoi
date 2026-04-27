import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Typography,
    IconButton, Grid, Stack, Divider, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Button,
    CircularProgress, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconX, IconClock, IconRulerMeasure } from '@tabler/icons-react';
import dayjs from 'dayjs';

import inundationApi from 'api/inundation';

const InundationHistoryDialog = ({ open, onClose, point }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    const loadHistory = useCallback(async () => {
        if (!point || !open) return;

        const pid = point.id || point.point_id;
        if (!pid) return;

        setLoading(true);
        try {
            const currentYear = dayjs().year();
            const now = dayjs().unix();

            // Gọi yearly history - đây là nguồn dữ liệu đáng tin cậy nhất
            const res = await inundationApi.getYearlyHistory(currentYear);
            const rawReports = Array.isArray(res) ? res : (res?.data?.data || []);

            // Lọc các đợt ngập theo point_id
            let filtered = rawReports.filter(r => r.point_id === pid);

            // Fallback: tìm theo tên đường nếu không có kết quả
            if (filtered.length === 0) {
                const name = point.street_name || point.name;
                if (name) filtered = rawReports.filter(r => r.street_name === name);
            }

            // Tính duration và sắp xếp mới nhất lên trên
            const processed = filtered
                .map(item => {
                    const startTime = item.created_at || item.start_time;
                    const endTime = item.end_time > 0 ? item.end_time : now;
                    return { ...item, durationSeconds: startTime ? Math.max(0, endTime - startTime) : 0 };
                })
                .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

            setHistory(processed);
        } catch (err) {
            console.error('Failed to load point history:', err);
        } finally {
            setLoading(false);
        }
    }, [point, open]);

    useEffect(() => {
        setHistory([]);
        loadHistory();
    }, [loadHistory]);

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '0 ph';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}ph`;
        return `${m}ph`;
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: 4 }, m: { xs: 0, sm: 2 }, maxHeight: { xs: '100%', sm: '90vh' } } } }}
            fullScreen={isMobile}
        >
            <DialogTitle sx={{ m: 0, p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Lịch sử ngập: {point?.name || point?.street_name}
                    </Typography>
                    <IconButton onClick={onClose} sx={{ color: 'grey.500' }}>
                        <IconX size={20} />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={3}>
                    <Box>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>ĐỊA CHỈ</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>{point?.address || '...'}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>ĐƠN VỊ</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>{point?.org_code || point?.org_name}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>SỐ LẦN NGẬP</Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: 'error.main' }}>{point?.count || history.length}</Typography>
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={32} color="secondary" />
                        </Box>
                    ) : history.length === 0 ? (
                        <Typography align="center" color="textSecondary" sx={{ py: 4 }}>
                            Chưa có dữ liệu lịch sử cho điểm ngập này
                        </Typography>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: '8px' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f1f3f4' }}>
                                        <TableRow>
                                            <TableCell align="center" sx={{ fontWeight: 700, width: '80px' }}>Đợt</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Thời gian bắt đầu</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Kích thước (DxRxS)</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>Thời gian ngập</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, width: '100px' }}>Thao tác</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {history.map((event, idx) => (
                                            <TableRow key={event.id} hover>
                                                <TableCell align="center" sx={{ fontWeight: 600 }}>#{history.length - idx}</TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <IconClock size={16} color="#666" />
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                            {dayjs.unix(event.created_at || event.start_time).format('DD/MM/YYYY HH:mm')}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <IconRulerMeasure size={16} color="#d32f2f" />
                                                        <Typography variant="body2" color="error" sx={{ fontWeight: 700 }}>
                                                            {event.length} x {event.width} x {event.depth}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 600 }}>
                                                    {formatDuration(event.durationSeconds)}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => window.open(`/admin/inundation/form?id=${event.id}&tab=1&readonly=true`, '_blank')}
                                                        sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0 }}
                                                    >
                                                        Xem
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Mobile Cards */}
                            <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
                                {history.map((event, idx) => (
                                    <Paper key={event.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>#{history.length - idx}</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                                                {event.length}x{event.width}x{event.depth}
                                            </Typography>
                                        </Box>
                                        <Stack spacing={1}>
                                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <IconClock size={14} />
                                                {dayjs.unix(event.created_at || event.start_time).format('DD/MM/YYYY HH:mm')}
                                            </Typography>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDuration(event.durationSeconds)}</Typography>
                                                <Button
                                                    variant="outlined" size="small"
                                                    onClick={() => window.open(`/admin/inundation/form?id=${event.id}&tab=1&readonly=true`, '_blank')}
                                                >
                                                    Xem
                                                </Button>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                ))}
                            </Stack>
                        </>
                    )}
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

export default InundationHistoryDialog;
