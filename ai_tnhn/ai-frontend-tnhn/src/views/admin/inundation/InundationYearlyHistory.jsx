import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, FormControl, InputLabel, Select, MenuItem, Stack, Box, Button,
    Dialog, DialogTitle, DialogContent, IconButton, Grid, Divider, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconFileExport, IconEye, IconX, IconClock, IconRulerMeasure } from '@tabler/icons-react';
import dayjs from 'dayjs';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import inundationApi from 'api/inundation';
import organizationApi from 'api/organization';
import useAuthStore from 'store/useAuthStore';

const InundationYearlyHistory = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(dayjs().year());
    const [history, setHistory] = useState([]);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const [orgs, setOrgs] = useState([]);
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const { role, isCompany } = useAuthStore();
    const canFilterAllOrgs = role === 'super_admin' || isCompany;

    const years = [];
    for (let y = dayjs().year(); y >= 2024; y--) {
        years.push(y);
    }

    useEffect(() => {
        if (canFilterAllOrgs) {
            organizationApi.getSelectionList().then(res => {
                if (res.data?.status === 'success') {
                    setOrgs(res.data.data?.shared || []);
                }
            });
        }
    }, [canFilterAllOrgs]);

    const loadHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await inundationApi.getYearlyHistory(year, selectedOrgId);
            if (res.data?.status === 'success') {
                setHistory(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load yearly history:', err);
        } finally {
            setLoading(false);
        }
    }, [year, selectedOrgId]);

    const handleExport = async () => {
        try {
            const response = await inundationApi.exportYearlyHistory(year, selectedOrgId);
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

    // Helper to format duration (seconds) into "Xh Yph"
    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '0 ph';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}ph`;
        return `${m}ph`;
    };

    // Aggregate data by Point
    const aggregatedData = useMemo(() => {
        const groups = {};
        const now = dayjs().unix();

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

            // If not resolved, use current time - start_time
            const endTime = item.end_time > 0 ? item.end_time : now;
            const durationSeconds = Math.max(0, endTime - item.start_time);

            groups[id].total_duration += durationSeconds;
            groups[id].events.push({
                ...item,
                durationSeconds
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

                    {canFilterAllOrgs && (
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Chọn xí nghiệp</InputLabel>
                            <Select
                                value={selectedOrgId}
                                label="Chọn xí nghiệp"
                                onChange={(e) => setSelectedOrgId(e.target.value)}
                            >
                                <MenuItem value="">Tất cả</MenuItem>
                                {orgs.map((o) => (
                                    <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

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

                {/* Main Yearly Summary - Desktop Table */}
                <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '4px' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                            <TableRow>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '60px', borderRight: '1px solid #ddd' }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>Điểm ngập lụt / Địa bàn</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '100px', borderRight: '1px solid #ddd' }}>Đơn vị</TableCell>
                                <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>Địa điểm / Quận</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '120px', borderRight: '1px solid #ddd' }}>Số lần ngập</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '180px', borderRight: '1px solid #ddd' }}>Tổng thời gian ngập</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '100px' }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
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
                                            {formatDuration(row.total_duration)}
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

                {/* Main Yearly Summary - Mobile Cards */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                    {loading ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={30} color="secondary" /></Box>
                    ) : aggregatedData.length === 0 ? (
                        <Typography align="center" color="textSecondary" sx={{ py: 4 }}>Không có dữ liệu cho năm {year}</Typography>
                    ) : (
                        <Stack spacing={2}>
                            {aggregatedData.map((row, index) => (
                                <Paper key={index} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                        <Box>
                                            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>{row.street_name || row.point_id}</Typography>
                                            <Typography variant="caption" color="textSecondary">{row.address || '...'}</Typography>
                                        </Box>
                                        <Chip label={`${row.count} lần`} color="error" size="small" sx={{ fontWeight: 800 }} />
                                    </Box>
                                    <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>Thời gian ngập:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDuration(row.total_duration)}</Typography>
                                        </Box>
                                        <Button variant="outlined" size="small" onClick={() => handleViewDetails(row)}>Chi tiết</Button>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </Box>
            </Stack>

            {/* Details Dialog */}
            <Dialog
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                maxWidth="md"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: 4 }, m: { xs: 0, sm: 2 }, maxHeight: { xs: '100%', sm: '90vh' } } } }}
                fullScreen={useMediaQuery(theme => theme.breakpoints.down('sm'))}
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
                <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Stack spacing={3}>
                        <Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>ĐỊA CHỈ</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedPoint?.address || '...'}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>ĐƠN VỊ</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedPoint?.org_code}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>SỐ LẦN NGẬP</Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'error.main' }}>{selectedPoint?.count}</Typography>
                                </Grid>
                            </Grid>
                        </Box>

                        <Divider />

                        {/* Desktop Table View */}
                        <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: '8px' }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#f1f3f4' }}>
                                    <TableRow>
                                        <TableCell align="center" sx={{ fontWeight: 700, width: '80px' }}>Đợt ngập</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Thời gian bắt đầu</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Kích thước (DxRxS)</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>Thời gian ngập</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, width: '100px' }}>Thao tác</TableCell>
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

                        {/* Mobile Card View */}
                        <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
                            {selectedPoint?.events.map((event, idx) => (
                                <Paper key={event.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}># {selectedPoint.events.length - idx}</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                                            {event.length}x{event.width}x{event.depth}
                                        </Typography>
                                    </Box>
                                    <Stack spacing={1}>
                                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <IconClock size={14} /> {dayjs.unix(event.start_time).format('DD/MM/YYYY HH:mm:ss')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDuration(event.durationSeconds)}</Typography>
                                            <Button
                                                variant="outlined" size="small"
                                                onClick={() => window.open(`/admin/inundation/form?id=${event.id}&tab=1&readonly=true`, '_blank')}
                                            >
                                                Xem báo cáo
                                            </Button>
                                        </Box>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    </Stack>
                </DialogContent>
            </Dialog>
        </MainCard>
    );
};

export default InundationYearlyHistory;
