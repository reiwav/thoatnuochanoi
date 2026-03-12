import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, Stack, TextField, MenuItem,
    CircularProgress, Button, InputAdornment, TablePagination, Skeleton,
    Dialog, DialogContent, IconButton
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { IconSearch, IconClock, IconAlertTriangle, IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import inundationApi from 'api/inundation';
import { getInundationImageUrl } from 'utils/imageHelper';
import { getTrafficStatusColor, getTrafficStatusLabel } from 'utils/trafficStatusHelper';
import { toast } from 'react-hot-toast';

const InundationAdminList = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0); // 0 = Điểm trực, 1 = Lịch sử báo cáo

    // Points State
    const [loadingPoints, setLoadingPoints] = useState(true);
    const [points, setPoints] = useState([]);

    // History State
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyReports, setHistoryReports] = useState([]);
    const [totalHistory, setTotalHistory] = useState(0);
    const [historyPage, setHistoryPage] = useState(0);
    const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);

    // Global Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [trafficFilter, setTrafficFilter] = useState('');

    // Viewer
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });

    const fetchPoints = async () => {
        setLoadingPoints(true);
        try {
            const response = await inundationApi.getPointsStatus();
            setPoints(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch points:', error);
        } finally {
            setLoadingPoints(false);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await inundationApi.listReports(historyPage, historyRowsPerPage, {
                status: statusFilter,
                traffic_status: trafficFilter,
                query: searchQuery
            });
            if (res.data?.status === 'success') {
                setHistoryReports(res.data.data.data || []);
                setTotalHistory(res.data.data.total || 0);
            }
        } catch (error) {
            toast.error('Lỗi khi tải lịch sử báo cáo');
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchPoints();
    }, []);

    useEffect(() => {
        if (activeTab === 1) fetchHistory();
    }, [activeTab, historyPage, historyRowsPerPage, statusFilter, trafficFilter, searchQuery]);

    const filteredPoints = useMemo(() => {
        let result = points;
        if (statusFilter) {
            result = result.filter(p => p.status === statusFilter);
        }
        if (trafficFilter) {
            result = result.filter(p => {
                const ts = p.active_report?.traffic_status || p.active_report?.trafficStatus;
                return ts === trafficFilter;
            });
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name?.toLowerCase().includes(q) ||
                p.address?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [points, searchQuery, statusFilter, trafficFilter]);

    const formatTime = (ts) => {
        if (!ts) return '-';
        return new Date(ts * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    };

    const handleOpenViewer = (imgs, idx = 0) => {
        if (!imgs || imgs.length === 0) return;
        setViewer({ open: true, images: imgs, index: idx });
    };
    const handleCloseViewer = () => setViewer({ ...viewer, open: false });
    const handlePrev = (e) => { e?.stopPropagation(); setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length })); };
    const handleNext = (e) => { e?.stopPropagation(); setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length })); };

    const renderImageViewer = () => (
        <Dialog open={viewer.open} onClose={handleCloseViewer} maxWidth="lg">
            <IconButton onClick={handleCloseViewer} sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.5)' }}>
                <IconX size={20} />
            </IconButton>
            <DialogContent sx={{ p: 0, bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', position: 'relative' }}>
                {viewer.images.length > 1 && (
                    <>
                        <IconButton onClick={handlePrev} sx={{ position: 'absolute', left: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}><IconChevronLeft size={32} /></IconButton>
                        <IconButton onClick={handleNext} sx={{ position: 'absolute', right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}><IconChevronRight size={32} /></IconButton>
                    </>
                )}
                <Box component="img" src={getInundationImageUrl(viewer.images[viewer.index])} sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }} />
            </DialogContent>
        </Dialog>
    );

    return (
        <MainCard
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconAlertTriangle size={24} color="red" />
                        <Typography variant="h3" sx={{ fontWeight: 800 }}>## TRỰC NGẬP LỤT HÀ NỘI</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <Chip label="Điểm trực" variant={activeTab === 0 ? 'filled' : 'outlined'} color="primary" onClick={() => setActiveTab(0)} sx={{ fontWeight: 700, cursor: 'pointer' }} />
                        <Chip label="Lịch sử báo cáo" variant={activeTab === 1 ? 'filled' : 'outlined'} color="primary" onClick={() => setActiveTab(1)} sx={{ fontWeight: 700, cursor: 'pointer' }} />
                    </Stack>
                </Box>
            }
        >
            <Box sx={{ mb: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                    <TextField
                        placeholder="Tìm tên đường, vị trí..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        sx={{ minWidth: 300 }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> }}
                    />

                    <TextField
                        select
                        label="Trạng thái"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setHistoryPage(0); }}
                        size="small"
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="active">Đang ngập</MenuItem>
                        {activeTab === 0 ? <MenuItem value="normal">Bình thường</MenuItem> : <MenuItem value="resolved">Đã kết thúc</MenuItem>}
                    </TextField>

                    <TextField
                        select
                        label="Giao thông"
                        value={trafficFilter}
                        onChange={(e) => { setTrafficFilter(e.target.value); setHistoryPage(0); }}
                        size="small"
                        sx={{ minWidth: 200 }}
                    >
                        <MenuItem value="">Tất cả giao thông</MenuItem>
                        <MenuItem value="Đi lại bình thường">Đi lại bình thường</MenuItem>
                        <MenuItem value="Đi lại khó khăn">Đi lại khó khăn</MenuItem>
                        <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
                    </TextField>

                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {activeTab === 0 ? `Hiển thị: ${filteredPoints.length} điểm` : `Tổng cộng: ${totalHistory} báo cáo`}
                    </Typography>
                </Stack>
            </Box>

            {/* Section 1: Điểm trực */}
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>Danh sách điểm trực</Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 4 }}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Điểm trực</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Địa chỉ / Tuyến đường</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Giao thông</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Kích thước</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Thời gian bắt đầu</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loadingPoints ? [1, 2, 3].map(i => <TableRow key={i}><TableCell colSpan={7}><Skeleton height={40} /></TableCell></TableRow>) :
                            filteredPoints.length === 0 ? <TableRow><TableCell colSpan={7} align="center">Trống</TableCell></TableRow> :
                                filteredPoints.map(point => (
                                    <TableRow key={point.id} hover>
                                        <TableCell><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{point.name}</Typography></TableCell>
                                        <TableCell><Typography variant="body2">{point.address}</Typography></TableCell>
                                        <TableCell><Chip label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'} color={point.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                                        <TableCell>{(point.active_report?.traffic_status || point.active_report?.trafficStatus) && <Chip label={getTrafficStatusLabel(point.active_report.traffic_status || point.active_report.trafficStatus)} size="small" color={getTrafficStatusColor(point.active_report.traffic_status || point.active_report.trafficStatus)} variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem' }} />}</TableCell>
                                        <TableCell>{point.status === 'active' ? `${point.active_report?.length || 0}x${point.active_report?.width || 0}x${point.active_report?.depth || 0}` : '-'}</TableCell>
                                        <TableCell>{point.status === 'active' ? formatTime(point.active_report?.start_time) : '-'}</TableCell>
                                        <TableCell align="right">
                                            <Button
                                                size="small" variant="text"
                                                onClick={() => navigate(`/admin/inundation/form?id=${point.active_report?.id || point.last_report_id}&tab=1&readonly=true`)}
                                            // The button should always be enabled as per instruction, even if no active/last report
                                            // disabled={!point.active_report && !point.last_report_id}
                                            >
                                                Xem chi tiết
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                        }
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Section 2: Lịch sử báo cáo */}
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>Lịch sử báo cáo toàn thành phố</Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Tuyến đường</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Kích thước</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Giao thông</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Ảnh</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loadingHistory ? [1, 2, 3].map(i => <TableRow key={i}><TableCell colSpan={7}><Skeleton height={40} /></TableCell></TableRow>) :
                            historyReports.length === 0 ? <TableRow><TableCell colSpan={7} align="center">Trống</TableCell></TableRow> :
                                historyReports.map(report => (
                                    <TableRow key={report.id} hover>
                                        <TableCell><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{report.street_name}</Typography></TableCell>
                                        <TableCell><Typography variant="body2">{formatTime(report.start_time)}</Typography></TableCell>
                                        <TableCell><Typography variant="body2">{report.length || 0}x{report.width || 0}x{report.depth || 0}</Typography></TableCell>
                                        <TableCell>{report.traffic_status && <Chip label={getTrafficStatusLabel(report.traffic_status)} size="small" variant="outlined" color={getTrafficStatusColor(report.traffic_status)} sx={{ fontWeight: 700, fontSize: '0.75rem' }} />}</TableCell>
                                        <TableCell><Chip label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'} color={report.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={0.5}>
                                                {report.images?.slice(0, 3).map((img, idx) => (
                                                    <Box key={idx} component="img" src={getInundationImageUrl(img)} onClick={() => handleOpenViewer(report.images, idx)} sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'divider' }} />
                                                ))}
                                                {report.images?.length > 3 && <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="caption">+{report.images.length - 3}</Typography></Box>}
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button size="small" variant="text" onClick={() => navigate(`/admin/inundation/form?id=${report.id}&tab=1&readonly=true`)}>Xem chi tiết</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                        }
                    </TableBody>
                </Table>
                <TablePagination rowsPerPageOptions={[10, 25, 50]} component="div" count={totalHistory} rowsPerPage={historyRowsPerPage} page={historyPage} onPageChange={(e, p) => setHistoryPage(p)} onRowsPerPageChange={(e) => { setHistoryRowsPerPage(parseInt(e.target.value, 10)); setHistoryPage(0); }} labelRowsPerPage="Dòng mỗi trang:" />
            </TableContainer>
            {renderImageViewer()}
        </MainCard>
    );
};

export default InundationAdminList;
