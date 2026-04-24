import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Stack, Chip, Badge, Avatar, TextField, MenuItem,
    Paper, Skeleton, CircularProgress, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    useMediaQuery, Grid, Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconSearch, IconAlertTriangle, IconUser, IconLogout,
    IconSend, IconChecklist, IconEngine, IconChevronRight,
    IconHistory, IconClock
} from '@tabler/icons-react';

import useAuthStore from 'store/useAuthStore';
import useInundationStore from 'store/useInundationStore';

// Common Components
import PermissionGuard from 'ui-component/PermissionGuard';
import EmployeeActionDialog from '../components/EmployeeActionDialog';
import InundationPointCard from './components/InundationPointCard';
import InundationHistoryCard from './components/InundationHistoryCard';
import ImageViewer from './components/ImageViewer';
import InundationDetailDialog from '../../shared/inundation/InundationDetailDialog';

const EmployeeInundationDashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { search } = useLocation();
    const downSM = useMediaQuery(theme.breakpoints.down('sm'));
    const basePath = '/employee';

    const { user: userInfo, logout, hasPermission, fetchPermissions } = useAuthStore();
    const {
        points, organizations, historyReports,
        loading, loadingHistory,
        fetchInitialData, fetchPoints, fetchHistory,
        filters, setFilters
    } = useInundationStore();

    // Local UI states
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
    const [historyPage, setHistoryPage] = useState(0);
    const [historyRowsPerPage] = useState(10);
    const [totalHistory, setTotalHistory] = useState(0);

    // Dialog state
    const [taskDialog, setTaskDialog] = useState({ open: false, mode: '', data: null });
    const [detailDialog, setDetailDialog] = useState({ open: false, point: null });

    // Read activeTab from URL
    const params = new URLSearchParams(search);
    const activeTab = parseInt(params.get('activeTab') || '0');

    // Initial Fetch
    useEffect(() => {
        fetchInitialData();
        fetchPermissions();
    }, []);

    // Polling Logic (20s)
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTab <= 1) fetchPoints();
        }, 20000);
        return () => clearInterval(interval);
    }, [activeTab]);

    // History Pagination Fetch
    useEffect(() => {
        if (activeTab === 2) {
            fetchHistory(historyPage, historyRowsPerPage).then(res => {
                if (res?.data) setTotalHistory(res.data.total || 0);
            });
        }
    }, [activeTab, historyPage, historyRowsPerPage, filters.orgFilter, filters.statusFilter, filters.searchQuery]);

    const stats = useMemo(() => {
        const active = points.filter(p => !!p.report_id).length;
        const total = points.length;
        const normal = total - active;
        return { active, total, normal };
    }, [points]);

    const filteredPoints = useMemo(() => {
        let result = activeTab === 1 ? points.filter(p => !!p.report_id) : points;

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
    }, [points, activeTab, filters]);

    const handleLogout = () => {
        logout();
        navigate('/pages/login', { replace: true });
    };

    const handleOpenViewer = (imgs, idx = 0) => setViewer({ open: true, images: imgs, index: idx });
    const handleOpenDetail = (point) => setDetailDialog({ open: true, point });

    const openTask = (mode, point) => {
        setTaskDialog({ open: true, mode, data: point });
    };

    const renderFilterBar = () => (
        <Box sx={{ mb: 2 }}>
            <TextField
                fullWidth
                placeholder="Tìm tên đường, địa chỉ..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                slotProps={{
                    input: {
                        startAdornment: <IconSearch size={20} style={{ marginRight: 12, opacity: 0.6 }} />,
                        sx: {
                            borderRadius: 4,
                            bgcolor: 'background.paper',
                            boxShadow: theme.shadows[1],
                            '&:hover': { boxShadow: theme.shadows[3] },
                            '& .MuiOutlinedInput-notchedOutline': { border: '1px solid', borderColor: 'divider' }
                        }
                    }
                }}
            />
        </Box>
    );

    const renderPointList = () => {
        if (loading) {
            return (
                <Grid container spacing={2}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 4 }} />
                        </Grid>
                    ))}
                </Grid>
            );
        }

        if (filteredPoints.length === 0) {
            return (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                    <Typography variant="h4" color="textSecondary" sx={{ mb: 1, fontWeight: 700 }}>Không tìm thấy kết quả</Typography>
                    <Typography variant="body2" color="textSecondary">Hãy thử tìm kiếm với từ khóa khác</Typography>
                </Box>
            );
        }

        return (
            <Grid container spacing={2}>
                {filteredPoints.map(point => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={point.id}>
                        <InundationPointCard
                            point={point}
                            openTask={openTask}
                            handleOpenViewer={handleOpenViewer}
                            onOpenDetail={handleOpenDetail}
                            onRefresh={fetchPoints}
                        />
                    </Grid>
                ))}
            </Grid>
        );
    };

    return (
        <Box sx={{ px: 1.5, pt: 2, pb: 10 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main' }}>
                    {activeTab === 2 ? 'Lịch sử' : activeTab === 3 ? 'Tài khoản' : 'Điểm trực ngập'}
                </Typography>
                <Badge badgeContent={stats.active} color="error">
                    <Avatar sx={{ bgcolor: 'error.lighter', width: 40, height: 40 }}>
                        <IconAlertTriangle size={22} color={theme.palette.error.main} />
                    </Avatar>
                </Badge>
            </Box>



            {/* Content Area */}
            {activeTab === 2 ? (
                <Stack spacing={1.5}>
                    {renderFilterBar()}
                    {loadingHistory ? [1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 3 }} />)
                        : historyReports.map(report => <InundationHistoryCard key={report.id} report={report} isMobile navigate={navigate} basePath={basePath} handleOpenViewer={handleOpenViewer} />)}
                </Stack>
            ) : activeTab === 3 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}><IconUser size={40} /></Avatar>
                    <Typography variant="h3" sx={{ fontWeight: 900 }}>{userInfo?.name || 'Cán bộ kỹ thuật'}</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>{userInfo?.email}</Typography>
                    <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
                        <MenuItem onClick={handleLogout} sx={{ py: 2, color: 'error.main' }}>
                            <IconLogout style={{ marginRight: 12 }} /> <b>Đăng xuất</b>
                        </MenuItem>
                    </Paper>
                </Box>
            ) : (
                <Box>
                    {renderFilterBar()}
                    {renderPointList()}
                </Box>
            )}

            {/* Common Task Dialog */}
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

            <ImageViewer viewer={viewer} onClose={() => setViewer({ ...viewer, open: false })} onPrev={() => setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }))} onNext={() => setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length }))} />
            
            <InundationDetailDialog 
                open={detailDialog.open}
                onClose={() => setDetailDialog({ open: false, point: null })}
                point={detailDialog.point}
            />
        </Box>
    );
};

export default EmployeeInundationDashboard;
