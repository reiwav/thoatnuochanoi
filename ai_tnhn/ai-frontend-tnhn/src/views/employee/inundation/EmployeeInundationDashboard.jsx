import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Stack, Chip, Badge, Avatar, TextField, MenuItem,
    Paper, Skeleton, CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconSearch, IconAlertTriangle, IconTools, IconHistory, IconUser, IconLogout } from '@tabler/icons-react';

import useAuthStore from 'store/useAuthStore';
import useInundationStore from 'store/useInundationStore';

// Common Components
import InundationPointCard from './components/InundationPointCard';
import PumpingStationCard from './components/PumpingStationCard';
import InundationHistoryCard from './components/InundationHistoryCard';
import ImageViewer from './components/ImageViewer';

const EmployeeInundationDashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { search } = useLocation();
    const basePath = '/employee';

    const { user: userInfo, logout } = useAuthStore();
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

    // Read activeTab from URL
    const params = new URLSearchParams(search);
    const activeTab = parseInt(params.get('activeTab') || '0');

    // Initial Fetch
    useEffect(() => {
        fetchInitialData();
    }, []);

    // Polling Logic (8s)
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTab <= 1) fetchPoints();
        }, 8000);
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

    const renderFilterBar = () => (
        <Stack direction="column" spacing={1.5} sx={{ mb: 2 }}>
            <TextField
                fullWidth size="small" placeholder="Tìm tên đường, địa chỉ..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                InputProps={{ startAdornment: <IconSearch size={18} style={{ marginRight: 8, opacity: 0.5 }} />, sx: { borderRadius: 3 } }}
            />
            <Stack direction="row" spacing={1}>
                <TextField
                    select fullWidth size="small" label="Đơn vị" value={filters.orgFilter}
                    onChange={(e) => setFilters({ orgFilter: e.target.value })}
                    InputProps={{ sx: { borderRadius: 3 } }}
                >
                    <MenuItem value="all">Tất cả đơn vị</MenuItem>
                    {organizations.map(org => <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>)}
                </TextField>
                <TextField
                    select fullWidth size="small" label="Trạng thái" value={filters.statusFilter}
                    onChange={(e) => setFilters({ statusFilter: e.target.value })}
                    InputProps={{ sx: { borderRadius: 3 } }}
                >
                    <MenuItem value="all">Tất cả</MenuItem>
                    <MenuItem value="active">Đang ngập</MenuItem>
                    <MenuItem value="normal">Bình thường</MenuItem>
                </TextField>
            </Stack>
        </Stack>
    );

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

            {/* Quick Tabs */}
            <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 1 }}>
                <Chip label={`Tất cả (${stats.total})`} variant={activeTab === 0 ? 'filled' : 'outlined'} color="primary" onClick={() => navigate(`${basePath}/inundation?activeTab=0`)} sx={{ fontWeight: 800, flexShrink: 0 }} />
                <Chip label={`Đang diễn biến (${stats.active})`} color="error" variant={activeTab === 1 ? 'filled' : 'outlined'} onClick={() => navigate(`${basePath}/inundation?activeTab=1`)} sx={{ fontWeight: 800, flexShrink: 0 }} />
                <Chip label="Lịch sử đợt ngập" variant={activeTab === 2 ? 'filled' : 'outlined'} color="primary" onClick={() => navigate(`${basePath}/inundation?activeTab=2`)} sx={{ fontWeight: 800, flexShrink: 0 }} />
                <Chip label="Cá nhân" variant={activeTab === 3 ? 'filled' : 'outlined'} color="primary" onClick={() => navigate(`${basePath}/inundation?activeTab=3`)} sx={{ fontWeight: 800, flexShrink: 0 }} />
            </Stack>

            {/* Content Area */}
            {activeTab === 2 ? (
                <Stack spacing={1.5}>
                    {renderFilterBar()}
                    {loadingHistory ? [1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 3 }} />)
                        : historyReports.map(report => <InundationHistoryCard key={report.id} report={report} isMobile navigate={navigate} basePath={basePath} handleOpenViewer={handleOpenViewer} />)}
                    {totalHistory > historyRowsPerPage && (
                         <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                             <CircularProgress size={24} />
                         </Box>
                    )}
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
                <Stack spacing={1.5}>
                    {renderFilterBar()}
                    {loading ? [1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 3 }} />)
                        : filteredPoints.map(point => <InundationPointCard key={point.id} point={point} isMobile navigate={navigate} basePath={basePath} handleOpenViewer={handleOpenViewer} />)}
                </Stack>
            )}

            <ImageViewer viewer={viewer} onClose={() => setViewer({ ...viewer, open: false })} onPrev={() => setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }))} onNext={() => setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length }))} />
        </Box>
    );
};

export default EmployeeInundationDashboard;
