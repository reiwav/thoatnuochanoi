import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Stack, Chip, Paper, TextField, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Skeleton, CircularProgress, TablePagination
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconSearch, IconAlertTriangle, IconRefresh, IconLayoutDashboard } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import useInundationStore from 'store/useInundationStore';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';

// Shared Components
import InundationPointCard from 'views/employee/inundation/components/InundationPointCard';
import InundationHistoryCard from 'views/employee/inundation/components/InundationHistoryCard';
import ImageViewer from 'views/employee/inundation/components/ImageViewer';

const AdminInundationDashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const basePath = '/admin';

    const {
        points, historyReports, organizations,
        loading, loadingHistory,
        fetchInitialData, fetchPoints, fetchHistory,
        filters, setFilters
    } = useInundationStore();

    // Local UI states
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
    const [activeTab, setActiveTab] = useState(0); // 0 = Điểm trực, 1 = Lịch sử
    const [historyPage, setHistoryPage] = useState(0);
    const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
    const [totalHistory, setTotalHistory] = useState(0);

    // Initial Fetch
    useEffect(() => {
        fetchInitialData();
    }, []);

    // Polling (10s)
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTab === 0) fetchPoints();
        }, 10000);
        return () => clearInterval(interval);
    }, [activeTab]);

    // History Fetch
    useEffect(() => {
        if (activeTab === 1) {
            fetchHistory(historyPage, historyRowsPerPage).then(res => {
                if (res) setTotalHistory(res.total || 0);
            });
        }
    }, [activeTab, historyPage, historyRowsPerPage, filters.orgFilter, filters.statusFilter, filters.searchQuery]);

    const filteredPoints = useMemo(() => {
        let result = points;
        if (filters.statusFilter === 'active') result = result.filter(p => !!p.report_id);
        if (filters.statusFilter === 'normal') result = result.filter(p => !p.report_id);
        if (filters.orgFilter !== 'all' && filters.orgFilter) {
            result = result.filter(p => p.org_id === filters.orgFilter);
        }
        if (filters.searchQuery.trim()) {
            const q = filters.searchQuery.toLowerCase();
            result = result.filter(p => p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q));
        }
        return [...result].sort((a, b) => {
            if (a.report_id && !b.report_id) return -1;
            if (!a.report_id && b.report_id) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [points, filters]);

    const handleOpenViewer = (imgs, idx = 0) => setViewer({ open: true, images: imgs, index: idx });

    return (
        <MainCard
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconLayoutDashboard size={24} color={theme.palette.primary.main} />
                        <Typography variant="h3">Quản lý Điểm ngập</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <Chip
                            label="Điểm đang trực"
                            variant={activeTab === 0 ? 'filled' : 'outlined'}
                            color="primary" onClick={() => setActiveTab(0)}
                            sx={{ fontWeight: 700 }}
                        />
                        <Chip
                            label="Lịch sử toàn thành phố"
                            variant={activeTab === 1 ? 'filled' : 'outlined'}
                            color="primary" onClick={() => setActiveTab(1)}
                            sx={{ fontWeight: 700 }}
                        />
                    </Stack>
                </Box>
            }
        >
            {/* Filter Bar */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth size="small" placeholder="Tìm tên đường, địa chỉ..."
                            value={filters.searchQuery}
                            onChange={(e) => setFilters({ searchQuery: e.target.value })}
                            InputProps={{ startAdornment: <IconSearch size={18} style={{ marginRight: 8, opacity: 0.5 }} />, sx: { borderRadius: 2, bgcolor: 'white' } }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <OrganizationSelect
                            value={filters.orgFilter === 'all' ? '' : filters.orgFilter}
                            onChange={(e) => setFilters({ orgFilter: e.target.value || 'all' })}
                            label="Đơn vị quản lý"
                            sx={{ bgcolor: 'white' }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            select fullWidth size="small" label="Trạng thái"
                            value={filters.statusFilter}
                            onChange={(e) => setFilters({ statusFilter: e.target.value })}
                            sx={{ bgcolor: 'white' }}
                            InputProps={{ sx: { borderRadius: 2 } }}
                        >
                            <MenuItem value="all">Tất cả trạng thái</MenuItem>
                            <MenuItem value="active">Đang diễn biến</MenuItem>
                            <MenuItem value="normal">Bình thường</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Button
                            fullWidth variant="outlined" startIcon={<IconRefresh size={18} />}
                            onClick={() => { fetchPoints(); if (activeTab === 1) fetchHistory(historyPage, historyRowsPerPage); }}
                            sx={{ borderRadius: 2, height: 40 }}
                        >
                            Làm mới
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {activeTab === 0 ? (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Table sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell sx={{ fontWeight: 700 }}>Tên điểm / Địa chỉ</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Đơn vị quản lý</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Giao thông</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, width: 120 }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <TableRow key={i}><TableCell colSpan={6}><Skeleton height={40} /></TableCell></TableRow>
                                ))
                            ) : filteredPoints.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Không tìm thấy điểm ngập nào</TableCell></TableRow>
                            ) : (
                                filteredPoints.map(point => (
                                    <InundationPointCard key={point.id} point={point} navigate={navigate} basePath={basePath} handleOpenViewer={handleOpenViewer} />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Table sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell sx={{ fontWeight: 700 }}>Tuyến đường</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Đơn vị</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Bắt đầu</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Kết thúc / Cập nhật</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingHistory ? (
                                [1, 2, 3].map(i => <TableRow key={i}><TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell></TableRow>)
                            ) : historyReports.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>Không có dữ liệu lịch sử</TableCell></TableRow>
                            ) : (
                                historyReports.map(report => (
                                    <InundationHistoryCard key={report.id} report={report} navigate={navigate} basePath={basePath} handleOpenViewer={handleOpenViewer} />
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div" count={totalHistory} rowsPerPage={historyRowsPerPage} page={historyPage}
                        onPageChange={(e, p) => setHistoryPage(p)}
                        onRowsPerPageChange={(e) => { setHistoryRowsPerPage(parseInt(e.target.value, 10)); setHistoryPage(0); }}
                        labelRowsPerPage="Dòng mỗi trang:"
                    />
                </TableContainer>
            )}

            <ImageViewer viewer={viewer} onClose={() => setViewer({ ...viewer, open: false })} onPrev={() => setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }))} onNext={() => setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length }))} />
        </MainCard>
    );
};

// Wrapper for Grid layout (since Grid is used above but not imported)
import { Grid, Button } from '@mui/material';

export default AdminInundationDashboard;
