import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Stack, Chip, Paper, TextField, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Skeleton, CircularProgress, TablePagination,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Tooltip, Divider, Grid
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
import InundationDetailDialog from '../../shared/inundation/InundationDetailDialog';

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
    const [taskDialog, setTaskDialog] = useState({ open: false, mode: '', data: null });
    const [confirmFinish, setConfirmFinish] = useState({ open: false, point: null });
    const [detailDialog, setDetailDialog] = useState({ open: false, point: null });

    // Initial Fetch
    useEffect(() => {
        fetchInitialData();
    }, []);

    // Polling (10s)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchPoints();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

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
    const handleOpenDetail = (point) => setDetailDialog({ open: true, point });

    const handleAction = (mode, point) => {
        if (mode === 'quick_finish') {
            setConfirmFinish({ open: true, point });
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

    const handleConfirmQuickFinish = async () => {
        if (confirmFinish.point) {
            await quickFinishPoint(confirmFinish.point.id);
            setConfirmFinish({ open: false, point: null });
        }
    };

    return (
        <MainCard
            contentSX={{ p: { xs: 0.5, sm: 2.5 } }}
            sx={{ mx: { xs: -1.5, sm: 0 }, borderRadius: { xs: 0, sm: 4 } }}
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconLayoutDashboard size={24} color={theme.palette.primary.main} />
                        <Typography variant="h3">Quản lý Điểm ngập</Typography>
                    </Stack>
                </Box>
            }
        >
            {/* Filter Bar */}
            <Paper sx={{ p: { xs: 1.2, sm: 2 }, mb: 3, bgcolor: 'grey.50', borderRadius: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider' }}>
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
                            onClick={() => fetchPoints()}
                            sx={{ borderRadius: 2, height: 40 }}
                        >
                            Làm mới
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            <Box>
                {loading ? (
                    <Grid container spacing={1}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={i} sx={{ display: 'flex' }}>
                                <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 4 }} />
                            </Grid>
                        ))}
                    </Grid>
                ) : filteredPoints.length === 0 ? (
                    <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                        <Typography color="textSecondary">Không tìm thấy điểm ngập nào</Typography>
                    </Paper>
                ) : (
                    <Grid container spacing={1}>
                        {filteredPoints.map(point => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={point.id} sx={{ display: 'flex' }}>
                                <AdminInundationCard 
                                    point={point} 
                                    onAction={handleAction} 
                                    onOpenViewer={handleOpenViewer}
                                    onOpenDetail={handleOpenDetail}
                                    navigate={navigate}
                                    basePath={basePath}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>

            <ImageViewer viewer={viewer} onClose={() => setViewer({ ...viewer, open: false })} onPrev={() => setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }))} onNext={() => setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length }))} />
            
            <InundationDetailDialog 
                open={detailDialog.open}
                onClose={() => setDetailDialog({ open: false, point: null })}
                point={detailDialog.point}
            />

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

            {/* Confirm Quick Finish Dialog */}
            <Dialog 
                open={confirmFinish.open} 
                onClose={() => setConfirmFinish({ open: false, point: null })}
                slotProps={{ paper: { sx: { borderRadius: 4, p: 1, minWidth: 320 } } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'error.lighter', color: 'error.main', display: 'flex' }}>
                        <IconAlertTriangle size={24} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Xác nhận kết thúc ngập</Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ py: 1 }}>
                        Bạn có chắc chắn muốn kết thúc nhanh tình trạng ngập tại điểm:
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main', mb: 1 }}>
                        {confirmFinish.point?.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        * Thao tác này sẽ đưa độ sâu về 0, cập nhật trạng thái trạm về Bình thường và đóng đợt ngập ngay lập tức.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button 
                        onClick={() => setConfirmFinish({ open: false, point: null })} 
                        color="inherit"
                        sx={{ fontWeight: 600 }}
                    >
                        Hủy bỏ
                    </Button>
                    <Button 
                        onClick={handleConfirmQuickFinish} 
                        variant="contained" 
                        color="error"
                        sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
                    >
                        Xác nhận kết thúc
                    </Button>
                </DialogActions>
            </Dialog>
        </MainCard>
    );
};

export default AdminInundationDashboard;
