import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, FormControl, InputLabel, Select, MenuItem, Stack, Box, Button,
    Dialog, DialogTitle, DialogContent, IconButton, Grid, Divider
} from '@mui/material';
import { IconFileExport, IconEye, IconX, IconClock, IconRulerMeasure } from '@tabler/icons-react';
import dayjs from 'dayjs';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import inundationApi from 'api/inundation';
import useAuthStore from 'store/useAuthStore';

const InundationYearlyHistory = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(dayjs().year());
    const [history, setHistory] = useState([]);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const years = [];
    for (let y = dayjs().year(); y >= 2024; y--) {
        years.push(y);
    }

    const loadHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await inundationApi.getYearlyHistory(year);
            if (res.data?.status === 'success') {
                setHistory(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load yearly history:', err);
        } finally {
            setLoading(false);
        }
    }, [year]);

    const handleExport = async () => {
        try {
            const response = await inundationApi.exportYearlyHistory(year);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `lich_su_ngap_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Aggregate data by Point
    const aggregatedData = useMemo(() => {
        const groups = {};
        history.forEach(item => {
            const id = item.point_id || item.street_name;
            if (!groups[id]) {
                groups[id] = {
                    ...item,
                    count: 0,
                    total_duration: 0,
                    events: []
                };
            }
            groups[id].count += 1;
            const duration = item.end_time ? Math.round((item.end_time - item.start_time) / 60) : 0;
            groups[id].total_duration += duration;
            groups[id].events.push({
                ...item,
                duration
            });
        });

        // Sort events within each group by start_time descending
        Object.values(groups).forEach(group => {
            group.events.sort((a, b) => b.start_time - a.start_time);
        });

        return Object.values(groups);
    }, [history]);

    const handleViewDetails = (point) => {
        setSelectedPoint(point);
        setDetailOpen(true);
    };

    return (
        <MainCard title={<Typography variant="h3" align="center" sx={{ textTransform: 'uppercase', py: 1 }}>Xem số liệu theo năm</Typography>}>
            <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-start">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Chọn năm</InputLabel>
                        <Select
                            value={year}
                            label="Chọn năm"
                            onChange={(e) => setYear(e.target.value)}
                        >
                            {years.map((y) => (
                                <MenuItem key={y} value={y}>{y}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<IconFileExport size="1.2rem" />}
                        onClick={handleExport}
                        sx={{ borderRadius: '8px', boxShadow: 'none' }}
                    >
                        Xuất ra Excel
                    </Button>
                </Stack>

                <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '4px' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                            <TableRow>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '60px', borderRight: '1px solid #ddd' }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>Điểm ngập lụt / Địa bàn</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '100px', borderRight: '1px solid #ddd' }}>Đơn vị</TableCell>
                                <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>Địa điểm / Quận</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '120px', borderRight: '1px solid #ddd' }}>Số lần ngập</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '150px', borderRight: '1px solid #ddd' }}>Tổng TG ngập (phút)</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '100px' }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={24} color="secondary" />
                                    </TableCell>
                                </TableRow>
                            ) : aggregatedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        Không có dữ liệu cho năm {year}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                aggregatedData.map((row, index) => (
                                    <TableRow key={row.point_id || row.street_name || index} hover>
                                        <TableCell align="center" sx={{ borderRight: '1px solid #eee' }}>{index + 1}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #eee', fontWeight: 600 }}>{row.street_name || row.point_id}</TableCell>
                                        <TableCell align="center" sx={{ borderRight: '1px solid #eee' }}>{row.org_code}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #eee', fontSize: '0.85rem' }}>{row.address || '...'}</TableCell>
                                        <TableCell align="center" sx={{ borderRight: '1px solid #eee', fontWeight: 700, color: 'error.main', fontSize: '1.1rem' }}>
                                            {row.count}
                                        </TableCell>
                                        <TableCell align="center" sx={{ borderRight: '1px solid #eee', fontWeight: 600 }}>
                                            {row.total_duration}
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton color="primary" onClick={() => handleViewDetails(row)}>
                                                <IconEye size={20} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Stack>

            {/* Details Dialog */}
            <Dialog 
                open={detailOpen} 
                onClose={() => setDetailOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ m: 0, p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Chi tiết lịch sử ngập: {selectedPoint?.street_name || selectedPoint?.point_id}
                    </Typography>
                    <IconButton
                        onClick={() => setDetailOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                    >
                        <IconX size={20} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        <Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>ĐỊA CHỈ</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedPoint?.address || '...'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>ĐƠN VỊ</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedPoint?.org_code}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>SỐ LẦN NGẬP TRONG NĂM</Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'error.main' }}>{selectedPoint?.count}</Typography>
                                </Grid>
                            </Grid>
                        </Box>
                        
                        <Divider />

                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#f1f3f4' }}>
                                    <TableRow>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>Đợt ngập</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Thời gian bắt đầu</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Kích thước (DxRxS)</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>Thời gian (phút)</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {selectedPoint?.events.map((event, idx) => (
                                        <TableRow key={event.id} hover>
                                            <TableCell align="center" sx={{ fontWeight: 600 }}>#{selectedPoint.events.length - idx}</TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <IconClock size={16} color="#666" />
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {dayjs.unix(event.start_time).format('DD/MM/YYYY HH:mm:ss')}
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
                                                {event.duration > 0 ? event.duration : '-'}
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
                    </Stack>
                </DialogContent>
            </Dialog>
        </MainCard>
    );
};

export default InundationYearlyHistory;
