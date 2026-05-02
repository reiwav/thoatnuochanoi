import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Stack, Chip, Paper, TextField, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Skeleton, CircularProgress, Pagination,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Tooltip, Divider, Grid,
    Tabs, Tab, Collapse, alpha, useMediaQuery, Card, CardContent
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTheme } from '@mui/material/styles';
import {
    IconSearch, IconAlertTriangle, IconRefresh, IconLayoutDashboard, IconHistory,
    IconChevronDown, IconChevronUp, IconMapPin, IconClock, IconUser, IconRulerMeasure,
    IconEye, IconSend, IconCircleCheck, IconClipboardCheck, IconEngine, IconChecklist
} from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import useInundationStore from 'store/useInundationStore';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

// Components
import AdminInundationActionMenu from './components/AdminInundationActionMenu';
import EmployeeActionDialog from '../../employee/components/EmployeeActionDialog';
import InundationDetailDialog from '../../shared/inundation/InundationDetailDialog';
import InundationHistoryDialog from '../../shared/inundation/InundationHistoryDialog';
import ImageViewer from './components/ImageViewer';
import PermissionGuard from 'ui-component/PermissionGuard';
import { getInundationImageUrl } from 'utils/imageHelper';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, ReportInfoSection } from '../../employee/inundation/components/TechnicalSections';

// Extracted Components
import InundationStatusChip from './components/InundationStatusChip';
import ActionButtons from './components/ActionButtons';
import InundationDesktopStatCard from './components/InundationDesktopStatCard';

// --- MAIN DASHBOARD COMPONENT ---

// --- MAIN DASHBOARD COMPONENT ---

const AdminInundationDashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const basePath = '/admin';

    const {
        points, historyReports, totalHistory,
        loading, loadingHistory,
        fetchInitialData, fetchPoints, fetchHistory,
        filters, setFilters, quickFinishPoint
    } = useInundationStore();

    // Local UI states
    const [page, setPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
    const [taskDialog, setTaskDialog] = useState({ open: false, mode: '', data: null });
    const [confirmFinish, setConfirmFinish] = useState({ open: false, point: null });
    const [detailDialog, setDetailDialog] = useState({ open: false, point: null });
    const [historyDialog, setHistoryDialog] = useState({ open: false, point: null });

    // Initial Fetch
    useEffect(() => {
        fetchInitialData();
    }, []);

    // Fetch History when filters/tab/page change
    useEffect(() => {
        if (filters.activeTab === 1) {
            fetchHistory(page - 1, rowsPerPage);
        }
    }, [filters.activeTab, filters.orgFilter, filters.fromTime, filters.toTime, filters.isFlooding, page]);

    // SSE + fallback polling (60s)
    useEffect(() => {
        const { connectSSE, disconnectSSE } = useInundationStore.getState();
        connectSSE();
        const interval = setInterval(() => {
            fetchPoints();
        }, 60000);
        return () => {
            disconnectSSE();
            clearInterval(interval);
        };
    }, []);

    const floodedCount = useMemo(() => points.filter(p => !!p.report_id).length, [points]);
    const normalCount = useMemo(() => points.length - floodedCount, [points, floodedCount]);

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
    const handleOpenHistory = (point) => setHistoryDialog({ open: true, point });

    const handleAction = (mode, point) => {
        if (mode === 'quick_finish') {
            setConfirmFinish({ open: true, point });
            return;
        }

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

    const handleTabChange = (event, newValue) => {
        // Obsolete
    };

    return (
        <MainCard
            contentSX={{ px: { xs: 0, sm: 2.5 } }}
            sx={{ mx: { xs: -2, sm: 0 }, borderRadius: { xs: 0, sm: 4 }, border: { xs: 'none', sm: '1px solid' }, borderColor: 'divider' }}
            title={
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconLayoutDashboard size={isMobile ? 20 : 24} color={theme.palette.primary.main} />
                    <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 800 }}>
                        {isMobile ? 'ĐIỂM NGẬP' : 'QUẢN LÝ ĐIỂM NGẬP'}
                    </Typography>
                </Stack>
            }
            secondary={
                <Stack direction="row" spacing={1} alignItems="center">
                    {!isMobile && (
                        <>
                            <Chip
                                label={`${floodedCount} Đang ngập`}
                                color="error"
                                variant="filled"
                                size="small"
                                sx={{ fontWeight: 800, borderRadius: 2 }}
                            />
                            <Chip
                                label={`${normalCount} Bình thường`}
                                color="success"
                                variant="filled"
                                size="small"
                                sx={{ fontWeight: 800, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 1), color: '#fff' }}
                            />
                        </>
                    )}
                    <Tooltip title="Làm mới dữ liệu">
                        <IconButton
                            color="primary"
                            onClick={() => fetchPoints()}
                            sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                borderRadius: 2,
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                            }}
                        >
                            <IconRefresh size={20} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            }
        >


            {/* Filter Bar */}
            <Box sx={{ mb: 3, px: { xs: 1.5, sm: 0 } }} sm={{ mb: 3 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth size="small"
                                placeholder="Tìm tên đường, địa chỉ..."
                                value={filters.searchQuery}
                                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                                slotProps={{
                                    input: {
                                        startAdornment: <IconSearch size={18} style={{ marginRight: 8, opacity: 0.5 }} />,
                                        sx: { borderRadius: 3 }
                                    }
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <OrganizationSelect
                                value={filters.orgFilter === 'all' ? '' : filters.orgFilter}
                                onChange={(e) => setFilters({ orgFilter: e.target.value || 'all' })}
                                label="Đơn vị quản lý"
                                sx={{ borderRadius: 3 }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                                select fullWidth size="small" label="Trạng thái"
                                value={filters.statusFilter}
                                onChange={(e) => setFilters({ statusFilter: e.target.value })}
                                slotProps={{ input: { sx: { borderRadius: 3 } } }}
                            >
                                <MenuItem key="all" value="all">Tất cả trạng thái</MenuItem>
                                <MenuItem key="active" value="active">Đang ngập</MenuItem>
                                <MenuItem key="normal" value="normal">Bình thường</MenuItem>
                            </TextField>
                        </Grid>

                    </Grid>
                </LocalizationProvider>
            </Box>

            <Box>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
                ) : (
                    <Box sx={{ px: { xs: 1, sm: 0 } }}>
                        {filteredPoints.length === 0 ? (
                            <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 4, border: '1px dashed', borderColor: 'divider', bgcolor: 'grey.50' }}>
                                <Typography color="textSecondary">Không tìm thấy điểm ngập</Typography>
                            </Paper>
                        ) : (
                            <Grid container spacing={2}>
                                {filteredPoints.map((point) => (
                                    <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={point.id} sx={{ display: 'flex' }}>
                                        <InundationDesktopStatCard
                                            point={point}
                                            onAction={handleAction}
                                            onOpenViewer={handleOpenViewer}
                                            onOpenDetail={handleOpenDetail}
                                            onOpenHistory={handleOpenHistory}
                                            navigate={navigate}
                                            basePath={basePath}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </Box>
                )}
            </Box>

            <ImageViewer viewer={viewer} onClose={() => setViewer({ ...viewer, open: false })} onPrev={() => setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }))} onNext={() => setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length }))} />

            <InundationDetailDialog
                open={detailDialog.open}
                onClose={() => setDetailDialog({ open: false, point: null })}
                point={detailDialog.point}
            />

            <InundationHistoryDialog
                open={historyDialog.open}
                onClose={() => setHistoryDialog({ open: false, point: null })}
                point={historyDialog.point}
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
                slotProps={{ paper: { sx: { borderRadius: 4, p: 1, minWidth: 280 } } }}
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
