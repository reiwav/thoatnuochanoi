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
import ImageViewer from './components/ImageViewer';
import PermissionGuard from 'ui-component/PermissionGuard';
import { getInundationImageUrl } from 'utils/imageHelper';
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, ReportInfoSection } from '../../employee/inundation/components/TechnicalSections';

// Extracted Components
import InundationStatusChip from './components/InundationStatusChip';
import ActionButtons from './components/ActionButtons';
import InundationMobileCard from './components/InundationMobileCard';
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
        setFilters({ activeTab: newValue });
        if (newValue === 1) setPage(1);
    };

    return (
        <MainCard
            contentSX={{ p: { xs: 1.5, sm: 2.5 } }}
            sx={{ mx: { xs: -1.5, sm: 0 }, borderRadius: { xs: 0, sm: 4 } }}
            title={
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconLayoutDashboard size={isMobile ? 20 : 24} color={theme.palette.primary.main} />
                    <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 800 }}>
                        {isMobile ? 'ĐIỂM NGẬP' : 'QUẢN LÝ ĐIỂM NGẬP'}
                    </Typography>
                </Stack>
            }
        >
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={filters.activeTab} onChange={handleTabChange} color="secondary" variant="scrollable" scrollButtons="auto">
                    <Tab icon={<IconLayoutDashboard size={18} />} iconPosition="start" label="Theo dõi trực tiếp" />
                    <Tab icon={<IconHistory size={18} />} iconPosition="start" label="Lịch sử báo cáo" />
                </Tabs>
            </Box>

            {/* Filter Bar */}
            <Box sx={{ mb: 3 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={filters.activeTab === 0 ? 4 : 3}>
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
                        <Grid item xs={12} md={filters.activeTab === 0 ? 3 : 2}>
                            <OrganizationSelect
                                value={filters.orgFilter === 'all' ? '' : filters.orgFilter}
                                onChange={(e) => setFilters({ orgFilter: e.target.value || 'all' })}
                                label="Đơn vị quản lý"
                                sx={{ borderRadius: 3 }}
                            />
                        </Grid>

                        {filters.activeTab === 1 && (
                            <>
                                <Grid item xs={12} md={2}>
                                    <DatePicker
                                        label="Từ ngày"
                                        value={filters.fromTime ? dayjs.unix(filters.fromTime) : null}
                                        onChange={(val) => setFilters({ fromTime: val ? val.startOf('day').unix() : null })}
                                        slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <DatePicker
                                        label="Đến ngày"
                                        value={filters.toTime ? dayjs.unix(filters.toTime) : null}
                                        onChange={(val) => setFilters({ toTime: val ? val.endOf('day').unix() : null })}
                                        slotProps={{ textField: { size: 'small', fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 3 } } } }}
                                    />
                                </Grid>
                            </>
                        )}

                        <Grid item xs={12} md={filters.activeTab === 0 ? 3 : 2}>
                            <TextField
                                select fullWidth size="small" label={filters.activeTab === 0 ? "Trạng thái" : "Trạng thái ngập"}
                                value={filters.activeTab === 0 ? filters.statusFilter : filters.isFlooding}
                                onChange={(e) => filters.activeTab === 0 ? setFilters({ statusFilter: e.target.value }) : setFilters({ isFlooding: e.target.value })}
                                slotProps={{ input: { sx: { borderRadius: 3 } } }}
                            >
                                {filters.activeTab === 0 ? (
                                    [
                                        <MenuItem key="all" value="all">Tất cả trạng thái</MenuItem>,
                                        <MenuItem key="active" value="active">Đang diễn biến</MenuItem>,
                                        <MenuItem key="normal" value="normal">Bình thường</MenuItem>
                                    ]
                                ) : (
                                    [
                                        <MenuItem key="all" value="">Tất cả</MenuItem>,
                                        <MenuItem key="flooding" value="true">Đang có nước</MenuItem>,
                                        <MenuItem key="dry" value="false">Đã rút hết</MenuItem>
                                    ]
                                )}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={filters.activeTab === 0 ? 2 : 1}>
                            <Stack direction="row" spacing={1}>
                                <Tooltip title="Làm mới dữ liệu">
                                    <IconButton
                                        color="primary"
                                        onClick={() => filters.activeTab === 0 ? fetchPoints() : fetchHistory(page - 1, rowsPerPage)}
                                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                                    >
                                        <IconRefresh size={20} />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Grid>
                    </Grid>
                </LocalizationProvider>
            </Box>

            <Box>
                {filters.activeTab === 0 ? (
                    loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
                    ) : (
                        <>
                            {/* Mobile List View (Kept as is) */}
                            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                                {filteredPoints.length === 0 ? (
                                    <Typography align="center" sx={{ py: 3, color: 'text.secondary' }}>Không tìm thấy điểm ngập</Typography>
                                ) : (
                                    filteredPoints.map((point) => (
                                        <InundationMobileCard
                                            key={point.id}
                                            point={point}
                                            onAction={handleAction}
                                            onOpenViewer={handleOpenViewer}
                                            onOpenDetail={handleOpenDetail}
                                            navigate={navigate}
                                            basePath={basePath}
                                        />
                                    ))
                                )}
                            </Box>

                            {/* Desktop Stat Card Grid View (4 per row) */}
                            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                                {filteredPoints.length === 0 ? (
                                    <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 4, border: '1px dashed', borderColor: 'divider', bgcolor: 'grey.50' }}>
                                        <Typography color="textSecondary">Không tìm thấy điểm ngập</Typography>
                                    </Paper>
                                ) : (
                                    <Grid container spacing={2}>
                                        {filteredPoints.map((point) => (
                                            <Grid item xs={12} sm={6} md={4} lg={3} key={point.id}>
                                                <InundationDesktopStatCard
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
                        </>
                    )
                ) : (
                    /* History Tab - Still Table */
                    <Box>
                        {loadingHistory ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                                <CircularProgress size={40} />
                            </Box>
                        ) : historyReports.length === 0 ? (
                            <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 4, border: '1px dashed', borderColor: 'divider', bgcolor: 'grey.50' }}>
                                <Typography color="textSecondary">Không tìm thấy báo cáo nào trong khoảng thời gian này</Typography>
                            </Paper>
                        ) : (
                            <>
                                <TableContainer component={Paper} elevation={0} sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                                    <Table>
                                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 800 }}>Ngày giờ</TableCell>
                                                <TableCell sx={{ fontWeight: 800 }}>Địa điểm</TableCell>
                                                <TableCell sx={{ fontWeight: 800 }}>Đơn vị</TableCell>
                                                <TableCell sx={{ fontWeight: 800 }}>Kích thước (DxRxS)</TableCell>
                                                <TableCell sx={{ fontWeight: 800 }}>Trạng thái</TableCell>
                                                <TableCell sx={{ fontWeight: 800 }} align="center">Thao tác</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {historyReports.map((report) => (
                                                <TableRow key={report.id} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {dayjs(report.start_time * 1000).format('HH:mm DD/MM/YYYY')}
                                                        </Typography>
                                                        <Typography variant="caption" color="textSecondary">
                                                            {report.status === 'resolved' ? `Kết thúc: ${dayjs(report.end_time * 1000).format('HH:mm DD/MM/YYYY')}` : 'Đang diễn biến'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{report.street_name}</Typography>
                                                        <Typography variant="caption" color="textSecondary">{report.address}</Typography>
                                                    </TableCell>
                                                    <TableCell>{report.org_name || report.org_id}</TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                            <IconRulerMeasure size={14} color={theme.palette.error.main} />
                                                            <Typography variant="body2" color="error" sx={{ fontWeight: 700 }}>
                                                                {report.length || 0} x {report.width || 0} x {report.depth || 0}
                                                            </Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={report.is_flooding ? 'Đang ngập' : 'Bình thường'}
                                                            color={report.is_flooding ? 'error' : 'success'}
                                                            size="small"
                                                            variant="light"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton color="primary" onClick={() => window.open(`/admin/inundation/form?id=${report.id}&tab=1&readonly=true`, '_blank')}>
                                                            <IconEye size={20} />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* Card List for Mobile */}
                                <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
                                    {historyReports.map((report) => (
                                        <Paper key={report.id} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                                    {dayjs(report.start_time * 1000).format('DD/MM HH:mm')}
                                                </Typography>
                                                <Chip
                                                    label={report.is_flooding ? 'Đang ngập' : 'Bình thường'}
                                                    color={report.is_flooding ? 'error' : 'success'}
                                                    size="small"
                                                    variant="light"
                                                    sx={{ fontWeight: 800, height: 20 }}
                                                />
                                            </Box>
                                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{report.street_name}</Typography>
                                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5 }}>{report.address}</Typography>
                                            <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Stack spacing={0.5}>
                                                    <Typography variant="caption" color="textSecondary">Kích thước (DxRxS)</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'error.main' }}>
                                                        {report.length} x {report.width} x {report.depth}
                                                    </Typography>
                                                </Stack>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<IconEye size={16} />}
                                                    onClick={() => window.open(`/admin/inundation/form?id=${report.id}&tab=1&readonly=true`, '_blank')}
                                                    sx={{ borderRadius: 2 }}
                                                >
                                                    Xem
                                                </Button>
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                    <Pagination
                                        count={Math.ceil(totalHistory / rowsPerPage) || 1}
                                        page={page}
                                        onChange={(e, v) => setPage(v)}
                                        color="primary"
                                    />
                                </Box>
                            </>
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
