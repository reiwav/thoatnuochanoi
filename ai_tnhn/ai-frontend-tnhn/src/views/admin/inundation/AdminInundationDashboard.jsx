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
import { getTotalItems } from 'utils/apiHelper';

// Shared Components
import InundationHistoryCard from './components/InundationHistoryCard';
import ImageViewer from './components/ImageViewer';
import { Grid, Button, IconButton, Tooltip, Divider } from '@mui/material';
import { IconChevronRight, IconEye, IconDotsVertical, IconMessageDots, IconRulerMeasure, IconTruck, IconCircleCheck, IconPhoto } from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

// Components
import AdminInundationActionMenu from './components/AdminInundationActionMenu';
import AdminInundationCard from './components/AdminInundationCard';
import EmployeeActionDialog from '../../employee/components/EmployeeActionDialog';

const AdminInundationDashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const basePath = '/admin';

    const {
        points, historyReports, organizations,
        loading, loadingHistory,
        fetchInitialData, fetchPoints, fetchHistory,
        filters, setFilters, resolveReport, quickFinishPoint
    } = useInundationStore();

    // Local UI states
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
    const [activeTab, setActiveTab] = useState(0); // 0 = Điểm trực, 1 = Lịch sử
    const [historyPage, setHistoryPage] = useState(0);
    const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
    const [totalHistory, setTotalHistory] = useState(0);

    const [taskDialog, setTaskDialog] = useState({ open: false, mode: '', data: null });

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
                if (res) setTotalHistory(getTotalItems(res));
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

    const handleAction = (mode, point) => {
        if (mode === 'quick_finish') {
            if (window.confirm(`Bạn có chắc chắn muốn kết thúc ngập tại điểm "${point.name}"?`)) {
                quickFinishPoint(point.id);
            }
            return;
        }
        
        // Map menu modes to Dialog modes
        const modeMap = {
            'comment': 'REVIEW',
            'report': 'REPORT',
            'survey': 'SURVEY',
            'mech': 'MECH'
        };
        
        setTaskDialog({
            open: true,
            mode: modeMap[mode],
            data: point
        });
    };

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
                <Box>
                    {loading ? (
                        <Grid container spacing={3}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                                    <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 4 }} />
                                </Grid>
                            ))}
                        </Grid>
                    ) : filteredPoints.length === 0 ? (
                        <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                            <Typography color="textSecondary">Không tìm thấy điểm ngập nào</Typography>
                        </Paper>
                    ) : (
                        <Grid container spacing={3}>
                            {filteredPoints.map(point => (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={point.id}>
                                    <AdminInundationCard 
                                        point={point} 
                                        onAction={handleAction} 
                                        onOpenViewer={handleOpenViewer}
                                        navigate={navigate}
                                        basePath={basePath}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Box>
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
            
            <EmployeeActionDialog
                open={taskDialog.open}
                mode={taskDialog.mode}
                data={taskDialog.data}
                onClose={() => setTaskDialog({ ...taskDialog, open: false })}
                onFinished={() => {
                    setTaskDialog({ ...taskDialog, open: false });
                    fetchPoints();
                }}
            />
        </MainCard>
    );
};

export default AdminInundationDashboard;
