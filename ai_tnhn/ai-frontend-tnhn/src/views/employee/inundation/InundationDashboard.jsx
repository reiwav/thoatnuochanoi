import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import React from 'react';
import dayjs from 'dayjs';
import {
    Box,
    Typography,
    Chip,
    Stack,
    IconButton,
    Divider,
    Collapse,
    TextField,
    Button,
    CircularProgress,
    Skeleton,
    Avatar,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Badge,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogContent,
    TablePagination,
    MenuItem,
    Grid,
    Menu
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
    IconChevronUp,
    IconChevronDown,
    IconX,
    IconSearch,
    IconAlertTriangle,
    IconUser,
    IconChevronRight,
    IconChevronLeft,
    IconLogout,
    IconEdit,
    IconDotsVertical,
    IconPlus,
    IconEye,
    IconCheck,
    IconHistory,
    IconTools
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import inundationApi from 'api/inundation';
import organizationApi from 'api/organization';
import pumpingStationApi from 'api/pumpingStation';
import PumpingStationReport from '../../admin/pumping-station/PumpingStationReport';
import MainCard from 'ui-component/cards/MainCard';
import useAuthStore from 'store/useAuthStore';
import authApi from 'api/auth';

import { getInundationImageUrl } from 'utils/imageHelper';
import { getTrafficStatusColor, getTrafficStatusLabel } from 'utils/trafficStatusHelper';
import { formatDateTime, formatDuration } from 'utils/dataHelper';

const getLatestData = (report) => {
    if (!report) return null;
    let data = { ...report, traffic_status: report.traffic_status || report.trafficStatus };

    const updates = report.updates && Array.isArray(report.updates) ? report.updates : [];
    const sortedUpdates = [...updates].sort((a, b) => b.timestamp - a.timestamp);

    // Determine timestamps
    if (sortedUpdates.length > 0) {
        const newest = sortedUpdates[0];
        const oldest = sortedUpdates[sortedUpdates.length - 1];

        // Find most recent dimensions, traffic status, and images
        const updateWithDimensions = sortedUpdates.find(u => u.length || u.width || u.depth);
        const updateWithTraffic = sortedUpdates.find(u => u.traffic_status || u.trafficStatus);
        const updateWithImages = sortedUpdates.find(u => u.images && u.images.length > 0);

        return {
            ...data,
            depth: updateWithDimensions?.depth || data.depth,
            length: updateWithDimensions?.length || data.length,
            width: updateWithDimensions?.width || data.width,
            images: (updateWithImages?.images && updateWithImages.images.length > 0) ? updateWithImages.images : (data.images || []),
            description: newest.description || data.description,
            timestamp: newest.timestamp,
            newest_ts: newest.timestamp,
            oldest_ts: oldest.timestamp,
            status: data.status === 'resolved' || data.status === 'normal' ? 'normal' : data.status,
            traffic_status: (data.status === 'resolved' || data.status === 'normal') ? "" : (updateWithTraffic?.traffic_status || updateWithTraffic?.trafficStatus || data.traffic_status)
        };
    }

    // Default if no updates
    const startTime = data.start_time || data.startTime || 0;
    return {
        ...data,
        timestamp: startTime,
        newest_ts: startTime,
        oldest_ts: startTime,
        traffic_status: (data.status === 'resolved' || data.status === 'normal') ? "" : data.traffic_status
    };
};

const CollapsiblePumpingStationRow = ({ station, isMobile, navigate, basePath }) => {
    const [open, setOpen] = useState(false);
    const lastReport = station.last_report;
    const theme = useTheme();

    return (
        <Paper 
            elevation={0} 
            sx={{ 
                p: 2, 
                mb: 1.5, 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: 4, 
                bgcolor: 'background.paper',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
                transition: 'all 0.3s ease'
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: lastReport ? 1 : 0, gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography
                        variant="h4"
                        onClick={() => navigate(`${basePath}/inundation?activeTab=1&assignedStationId=${station.id}`)}
                        sx={{
                            fontWeight: 900,
                            color: 'primary.dark',
                            mb: 1,
                            lineHeight: 1.2,
                            cursor: 'pointer',
                            '&:hover': { color: 'primary.main' }
                        }}
                    >
                        {station.name}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        <Chip
                            label={`${station.pump_count} máy bơm`}
                            size="small"
                            sx={{ fontWeight: 800, bgcolor: 'primary.lighter', color: 'primary.main', height: 24 }}
                        />
                        {lastReport ? (
                             <Chip
                                label={`Cập nhật: ${formatDateTime(lastReport.timestamp)}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 700, height: 24 }}
                            />
                        ) : (
                            <Chip
                                label="Chưa có báo cáo"
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{ fontWeight: 700, height: 24 }}
                            />
                        )}
                    </Stack>
                </Box>
                {lastReport && (
                    <IconButton size="small" onClick={() => setOpen(!open)} sx={{ mt: -0.5, bgcolor: open ? 'primary.lighter' : 'transparent' }}>
                        {open ? <IconChevronUp size={22} color={theme.palette.primary.main} /> : <IconChevronDown size={22} />}
                    </IconButton>
                )}
            </Box>

            <Collapse in={open} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 3, border: '1px solid', borderColor: 'grey.100' }}>
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="success.main" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>VẬN HÀNH</Typography>
                                <Typography variant="h3" sx={{ fontWeight: 900, color: 'success.main' }}>{lastReport?.operating_count || 0}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>ĐANG ĐÓNG</Typography>
                                <Typography variant="h3" sx={{ fontWeight: 900, color: 'error.main' }}>{lastReport?.closed_count || 0}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="warning.main" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>BẢO DƯỠNG</Typography>
                                <Typography variant="h3" sx={{ fontWeight: 900, color: 'warning.main' }}>{lastReport?.maintenance_count || 0}</Typography>
                            </Box>
                        </Grid>
                        
                        {(lastReport?.note || lastReport?.user_name) && (
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                                {lastReport?.note && (
                                    <Box sx={{ mb: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.5, textTransform: 'uppercase' }}>Ghi chú vận hành</Typography>
                                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary', bgcolor: 'white', p: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'grey.200' }}>
                                            "{lastReport.note}"
                                        </Typography>
                                    </Box>
                                )}
                                <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled' }}>
                                        Người báo cáo:
                                    </Typography>
                                    <Chip 
                                        label={lastReport.user_name} 
                                        size="small" 
                                        avatar={<Avatar sx={{ width: 16, height: 16, fontSize: '0.6rem' }}><IconUser size={10} /></Avatar>}
                                        sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }} 
                                    />
                                </Stack>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            </Collapse>
        </Paper>
    );
};

const CollapsiblePointRow = ({ point, organizations, handleOpenViewer, navigate, isMobile, basePath, hasPermission, isEmployee }) => {
    const [open, setOpen] = useState(point.status === 'active');
    const latest = useMemo(() => getLatestData(point.active_report || point.last_report), [point]);

    // Action Menu State
    const [anchorEl, setAnchorEl] = useState(null);
    const menuOpen = Boolean(anchorEl);
    const handleMenuClick = (event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const needsCorrection = useMemo(() => {
        const report = point.active_report || point.last_report;
        return report?.needs_correction || report?.updates?.some(u => u.needs_correction);
    }, [point]);
    const needsCorrectionUpdateId = useMemo(() => {
        const report = point.active_report || point.last_report;
        return report?.needs_correction_update_id || '';
    }, [point]);

    const renderCard = () => (
        <Paper elevation={0} sx={{ p: 2, mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography
                        variant="h5"
                        onClick={() => {
                            if (point.status === 'active') {
                                if (hasPermission('inundation:edit') || (isEmployee && needsCorrection)) {
                                    let url = `${basePath}/inundation/form?tab=1&id=${point.active_report.id}&name=${encodeURIComponent(point.name)}`;
                                    if (needsCorrection && needsCorrectionUpdateId) {
                                        url += `&edit_update_id=${needsCorrectionUpdateId}`;
                                    }
                                    navigate(url);
                                }
                            } else {
                                if (hasPermission('inundation:create')) navigate(`${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`);
                            }
                        }}
                        sx={{
                            fontWeight: 900,
                            color: 'primary.dark',
                            mb: 1,
                            lineHeight: 1.2,
                            cursor: (point.status === 'active' ? (hasPermission('inundation:edit') || (isEmployee && needsCorrection)) : hasPermission('inundation:create')) ? 'pointer' : 'default',
                            '&:hover': { color: (point.status === 'active' ? (hasPermission('inundation:edit') || (isEmployee && needsCorrection)) : hasPermission('inundation:create')) ? 'primary.main' : 'primary.dark' }
                        }}
                    >
                        {point.name}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                            label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'}
                            color={point.status === 'active' ? 'error' : 'success'}
                            size="small" sx={{ fontWeight: 800 }}
                        />
                        {point.status === 'active' && latest?.traffic_status && (
                            <Chip
                                label={getTrafficStatusLabel(latest.traffic_status)}
                                size="small" color={getTrafficStatusColor(latest.traffic_status)}
                                variant="outlined" sx={{ fontWeight: 800 }}
                            />
                        )}
                        {needsCorrection && (
                            <Chip
                                label="CẦN SỬA"
                                size="small"
                                color="error"
                                sx={{
                                    fontWeight: 900,
                                    animation: 'blink 1s infinite',
                                    border: '1px solid white'
                                }}
                            />
                        )}
                    </Stack>
                </Box>
                {point.status === 'active' && (
                    <IconButton size="small" onClick={() => setOpen(!open)} sx={{ mt: -0.5 }}>
                        {open ? <IconChevronUp size={22} /> : <IconChevronDown size={22} />}
                    </IconButton>
                )}
            </Box>

            <Collapse in={open} timeout="auto" unmountOnExit>
                <Stack spacing={2} sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {point.address}
                    </Typography>

                    <Box>
                        <Typography variant="body2" color="text.secondary">Đơn vị quản lý:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {point.org_name || organizations.find((o) => o.id === point.org_id)?.name || ''}
                        </Typography>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">Kích thước ngập:</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>
                                {latest ? `${latest.length || 0}m x ${latest.width || 0}m x ${latest.depth || 0}m` : '-'}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">Thời gian bắt đầu:</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>
                                {latest ? formatDateTime(latest.start_time) : '-'}
                            </Typography>
                            {latest && (
                                <Typography variant="caption" color={point.status === 'active' ? "error" : "text.secondary"} sx={{ fontWeight: 700, display: 'block', mt: 0.5, fontSize: '0.8rem' }}>
                                    {point.status === 'active'
                                        ? `Cập nhật lúc: ${formatDateTime(point.updated_at || latest.newest_ts)} (Đã ngập ${formatDuration(latest.start_time)})`
                                        : `Đã kết thúc`}
                                </Typography>
                            )}
                        </Grid>
                    </Grid>

                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 700 }}>Ảnh liên quan:</Typography>
                        {latest?.images?.length > 0 ? (
                            <Box sx={{ display: 'flex', gap: 1.2, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 4 } }}>
                                {latest.images.map((img, idx) => (
                                    <Box
                                        key={idx} component="img" src={getInundationImageUrl(img)}
                                        onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.images, idx); }}
                                        sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', cursor: 'zoom-in', border: '1px solid', borderColor: 'divider', flexShrink: 0, transition: 'transform .2s', '&:hover': { transform: 'scale(1.02)' } }}
                                    />
                                ))}
                            </Box>
                        ) : (
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Không có ảnh</Typography>
                        )}
                    </Box>

                    {point.status === 'active' ? (
                        (hasPermission('inundation:edit') || (isEmployee && needsCorrection)) && (
                            <Button
                                fullWidth variant="contained" color="error" size="large"
                                onClick={() => {
                                    let url = `${basePath}/inundation/form?tab=1&id=${point.active_report.id}&name=${encodeURIComponent(point.name)}`;
                                    if (needsCorrection && needsCorrectionUpdateId) {
                                        url += `&edit_update_id=${needsCorrectionUpdateId}`;
                                    }
                                    navigate(url);
                                }}
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 800,
                                    py: 1.5,
                                    animation: needsCorrection ? 'pulse-red 2s infinite' : 'none'
                                }}
                            >
                                {needsCorrection ? 'Chỉnh sửa theo yêu cầu' : 'Cập nhật tình hình'}
                            </Button>
                        )
                    ) : (
                        hasPermission('inundation:create') && (
                            <Button
                                fullWidth variant="contained" color="primary" size="large"
                                onClick={() => navigate(`${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`)}
                                sx={{ borderRadius: 2, fontWeight: 800, py: 1.5 }}
                            >
                                Báo cáo điểm ngập
                            </Button>
                        )
                    )}
                </Stack>
            </Collapse>
        </Paper>
    );

    if (isMobile) return renderCard();

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ width: 40, p: 2 }}>
                    {point.status === "active" && (
                        <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                            {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell sx={{ p: 2 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 800,
                            cursor: (point.status === 'active' ? (hasPermission('inundation:edit') || (isEmployee && needsCorrection)) : hasPermission('inundation:create')) ? 'pointer' : 'default',
                            '&:hover': { color: (point.status === 'active' ? (hasPermission('inundation:edit') || (isEmployee && needsCorrection)) : hasPermission('inundation:create')) ? 'primary.main' : 'primary.dark' },
                            color: 'primary.dark'
                        }}
                        onClick={() => {
                            if (point.status === 'active') {
                                if (hasPermission('inundation:edit') || (isEmployee && needsCorrection)) {
                                    let url = `${basePath}/inundation/form?tab=1&id=${point.active_report.id}&name=${encodeURIComponent(point.name)}`;
                                    if (needsCorrection && needsCorrectionUpdateId) {
                                        url += `&edit_update_id=${needsCorrectionUpdateId}`;
                                    }
                                    navigate(url);
                                }
                            } else {
                                if (hasPermission('inundation:create')) navigate(`${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`);
                            }
                        }}
                    >
                        {point.name}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="primary">
                        {point.org_name || organizations.find((o) => o.id === point.org_id)?.name || ''}
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    <Chip
                        label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'}
                        color={point.status === 'active' ? 'error' : 'success'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                    />
                </TableCell>
                <TableCell>
                    {point.status === 'active' && latest?.traffic_status && (
                        <Chip
                            label={getTrafficStatusLabel(latest.traffic_status)}
                            size="small"
                            color={getTrafficStatusColor(latest.traffic_status)}
                            variant="outlined"
                            sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                        />
                    )}
                </TableCell>
                <TableCell align="center" sx={{ p: 2, width: 120 }}>
                    {point.report_id ? (
                        <>
                            <IconButton size="small" onClick={handleMenuClick}>
                                <IconDotsVertical size={20} />
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl}
                                open={menuOpen}
                                onClose={handleMenuClose}
                                onClick={(e) => e.stopPropagation()}
                                PaperProps={{
                                    elevation: 3,
                                    sx: { borderRadius: 2, minWidth: 150 }
                                }}
                            >
                                <MenuItem onClick={() => { handleMenuClose(); navigate(`${basePath}/inundation/form?id=${point.report_id}&tab=1&readonly=true`); }}>
                                    <ListItemIcon><IconEye size={18} /></ListItemIcon>
                                    <ListItemText primary="Xem chi tiết" />
                                </MenuItem>
                                {hasPermission('inundation:edit') && (
                                    <MenuItem onClick={() => {
                                        handleMenuClose();
                                        let url = `${basePath}/inundation/form?tab=1&id=${point.report_id}&name=${encodeURIComponent(point.name)}`;
                                        if (needsCorrection && needsCorrectionUpdateId) {
                                            url += `&edit_update_id=${needsCorrectionUpdateId}`;
                                        }
                                        navigate(url);
                                    }}>
                                        <ListItemIcon><IconEdit size={18} /></ListItemIcon>
                                        <ListItemText primary={needsCorrection ? "Sửa lỗi" : "Cập nhật tiến độ"} />
                                    </MenuItem>
                                )}
                                {hasPermission('inundation:edit') && !isEmployee && (
                                    <MenuItem
                                        sx={{ color: 'success.main' }}
                                        onClick={async () => {
                                            handleMenuClose();
                                            if (window.confirm('Xác nhận kết thúc ngập cho điểm này?')) {
                                                try {
                                                    await inundationApi.resolveReport(point.report_id);
                                                    toast.success('Đã kết thúc ngập');
                                                    window.location.reload();
                                                } catch (err) {
                                                    toast.error('Lỗi khi kết thúc ngập');
                                                }
                                            }
                                        }}
                                    >
                                        <ListItemIcon><IconCheck size={18} color="green" /></ListItemIcon>
                                        <ListItemText primary="Kết thúc ngập" />
                                    </MenuItem>
                                )}
                            </Menu>
                        </>
                    ) : (
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`)}
                            title="Tạo báo cáo mới"
                        >
                            <IconPlus size={20} />
                        </IconButton>
                    )}
                </TableCell>
            </TableRow>
            {point.status === 'active' && (
                <TableRow>
                    <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ m: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
                                    {point.address}
                                </Typography>
                                <Stack spacing={1.5}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">Kích thước ngập:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {latest ? `${latest.length || 0}m x ${latest.width || 0}m x ${latest.depth || 0}m` : '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">Thời gian:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{`Bắt đầu: ${formatDateTime(latest.start_time)}`}</Typography>
                                            <Grid item xs={12}>
                                                <Typography variant="caption" color={point.status === 'active' ? "error" : "text.secondary"} sx={{ fontWeight: 700, display: 'block', mt: 0.5, fontSize: '0.8rem' }}>
                                                    {point.status === 'active'
                                                        ? `Cập nhật lúc: ${formatDateTime(point.updated_at || latest.newest_ts)} (Đã ngập ${formatDuration(latest.start_time)})`
                                                        : `Đã kết thúc`}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ảnh liên quan:</Typography>
                                        {latest?.images?.length > 0 ? (
                                            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                                                {latest.images.map((img, idx) => (
                                                    <Box
                                                        key={idx} component="img" src={getInundationImageUrl(img)}
                                                        onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.images, idx); }}
                                                        sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}
                                                    />
                                                ))}
                                            </Stack>
                                        ) : (
                                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Không có ảnh</Typography>
                                        )}
                                    </Box>

                                </Stack>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
};

const CollapsibleHistoryRow = ({ report, organizations, handleOpenViewer, navigate, isMobile, basePath, hasPermission, isEmployee }) => {
    const [open, setOpen] = useState(false);
    const latest = useMemo(() => getLatestData(report), [report]);

    const renderCard = () => (
        <Paper elevation={0} sx={{ p: 2, mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography
                        variant="h5"
                        onClick={() => navigate(`${basePath}/inundation/form?id=${report.id}&tab=1&readonly=true`)}
                        sx={{ fontWeight: 900, color: 'primary.dark', mb: 1, lineHeight: 1.2, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                    >
                        {report.street_name}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Chip
                            label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'}
                            color={report.status === 'active' ? 'error' : 'success'}
                            size="small" sx={{ fontWeight: 800 }}
                        />
                        {(report?.needs_correction || report?.updates?.some(u => u.needs_correction)) && (
                            <Chip
                                label="CẦN SỬA"
                                size="small"
                                color="error"
                                sx={{
                                    fontWeight: 900,
                                    animation: 'blink 1s infinite',
                                    border: '1px solid white'
                                }}
                            />
                        )}
                    </Stack>
                </Box>
                <IconButton size="small" onClick={() => setOpen(!open)} sx={{ mt: -0.5 }}>
                    {open ? <IconChevronUp size={22} /> : <IconChevronDown size={22} />}
                </IconButton>
            </Box>

            <Collapse in={open} timeout="auto" unmountOnExit>
                <Stack spacing={2} sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary">Đơn vị quản lý:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {organizations.find((o) => o.id === report.org_id)?.name || report.org_id}
                        </Typography>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">Thời gian ngập:</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>{`Bắt đầu: ${formatDateTime(report.start_time)}`}</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>{report.status === 'resolved' ? `Kết thúc: ${formatDateTime(report.end_time)}` : `Cập nhật: ${formatDateTime(report.updated_at || latest.newest_ts)}`}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mt: 0.5, fontSize: '0.8rem' }}>
                                Tổng thời gian: {formatDuration(report.start_time, report.end_time)}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">Kích thước ngập:</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>{`${latest?.length || 0}m x ${latest?.width || 0}m x ${latest?.depth || 0}m`}</Typography>
                        </Grid>
                    </Grid>

                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 700 }}>Ảnh liên quan:</Typography>
                        {latest?.images?.length > 0 ? (
                            <Box sx={{ display: 'flex', gap: 1.2, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 4 } }}>
                                {latest.images.map((img, idx) => (
                                    <Box
                                        key={idx} component="img" src={getInundationImageUrl(img)}
                                        onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.images, idx); }}
                                        sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', cursor: 'zoom-in', border: '1px solid', borderColor: 'divider', flexShrink: 0, transition: 'transform .2s', '&:hover': { transform: 'scale(1.02)' } }}
                                    />
                                ))}
                            </Box>
                        ) : (
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Không có ảnh</Typography>
                        )}
                    </Box>

                    <Button
                        fullWidth variant="contained" color="primary" size="large"
                        onClick={() => navigate(`${basePath}/inundation/form?id=${report.id}&tab=1&readonly=true`)}
                        sx={{ borderRadius: 2, fontWeight: 800, py: 1.5 }}
                    >
                        Xem chi tiết
                    </Button>


                </Stack>
            </Collapse>
        </Paper>
    );

    if (isMobile) return renderCard();

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
                <TableCell sx={{ width: 40, p: 2 }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ p: 2 }}>
                    <Typography
                        variant="body2"
                        sx={{ fontWeight: 800, cursor: 'pointer', '&:hover': { color: 'primary.main' }, color: 'primary.dark' }}
                        onClick={() => navigate(`${basePath}/inundation/form?id=${report.id}&tab=1&readonly=true`)}
                    >
                        {report.street_name}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="primary">
                        {organizations.find((o) => o.id === report.org_id)?.name || report.org_id}
                    </Typography>
                </TableCell>
                <TableCell sx={{ p: 2, display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDateTime(report.start_time)}</Typography>
                </TableCell>
                <TableCell sx={{ p: 2, display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{report.status === 'resolved' ? formatDateTime(report.end_time) : formatDateTime(report.updated_at || latest.newest_ts)}</Typography>
                </TableCell>
                <TableCell sx={{ p: 2, display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDuration(report.start_time, report.end_time)}</Typography>
                </TableCell>
                <TableCell>
                    <Chip
                        label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'}
                        color={report.status === 'active' ? 'error' : 'success'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                    />
                </TableCell>
                <TableCell align="right" sx={{ p: 2 }}>
                    <Button size="small" variant="text" onClick={() => navigate(`${basePath}/inundation/form?id=${report.id}&tab=1&readonly=true`)}>
                        Xem chi tiết
                    </Button>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
                                Chi tiết báo cáo
                            </Typography>
                            <Stack spacing={1.5}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Thời gian ngập:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {`Bắt đầu: ${formatDateTime(report.start_time)}`}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {report.status === 'resolved' ? `Kết thúc: ${formatDateTime(report.end_time)}` : `Cập nhật: ${formatDateTime(report.updated_at || latest.newest_ts)}`}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mt: 0.5, color: 'primary.main' }}>
                                            Tổng thời gian: {formatDuration(report.start_time, report.end_time)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Giao thông:</Typography>
                                        {report.status === 'active' && latest?.traffic_status ? (
                                            <Chip
                                                label={getTrafficStatusLabel(latest.traffic_status)}
                                                size="small"
                                                color={getTrafficStatusColor(latest.traffic_status)}
                                                variant="outlined"
                                                sx={{ fontWeight: 800, fontSize: '0.75rem', mt: 0.5 }}
                                            />
                                        ) : (
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography>
                                        )}
                                    </Grid>
                                </Grid>

                                {latest?.review_comment && (
                                    <Box sx={{ mt: 1, p: 1.5, bgcolor: '#fff5f5', borderRadius: 2, border: '1px solid', borderColor: '#ffc1c1' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main', display: 'block', mb: 0.5 }}>NHẬN XÉT CỦA REVIEWER:</Typography>
                                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'error.dark', fontWeight: 600 }}>{latest.review_comment}</Typography>
                                    </Box>
                                )}

                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ảnh liên quan:</Typography>
                                    {latest?.images?.length > 0 ? (
                                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                                            {latest.images.map((img, idx) => (
                                                <Box
                                                    key={idx} component="img" src={getInundationImageUrl(img)}
                                                    onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.images, idx); }}
                                                    sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}
                                                />
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Không có ảnh</Typography>
                                    )}
                                </Box>

                            </Stack>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

const InundationDashboard = () => {
    const navigate = useNavigate();
    const { search } = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Get auth state from Zustand
    const { isEmployee, role: userRole, user: userInfo, logout, hasPermission } = useAuthStore();
    const basePath = isEmployee ? '/company' : '/admin';

    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [historyStatus, setHistoryStatus] = useState('');
    const [historyTrafficStatus, setHistoryTrafficStatus] = useState('');
    const [orgFilter, setOrgFilter] = useState('');
    const [organizations, setOrganizations] = useState([]);
    const [assignedStation, setAssignedStation] = useState(null);
    const [openPumpHistory, setOpenPumpHistory] = useState(false);

    // Pagination for History
    const [historyPage, setHistoryPage] = useState(0);
    const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
    const [totalHistory, setTotalHistory] = useState(0);

    const [pumpingHistory, setPumpingHistory] = useState([]);
    const [loadingPumpingHistory, setLoadingPumpingHistory] = useState(false);

    const [pumpingStations, setPumpingStations] = useState([]);
    const [loadingPumpingStations, setLoadingPumpingStations] = useState(false);

    // Lightbox viewer
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });

    const handleOpenViewer = (imgs, idx = 0) => {
        if (!imgs || imgs.length === 0) return;
        setViewer({ open: true, images: imgs, index: idx });
    };
    const handleCloseViewer = () => setViewer({ ...viewer, open: false });
    const handlePrev = (e) => {
        e?.stopPropagation();
        setViewer((v) => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }));
    };
    const handleNext = (e) => {
        e?.stopPropagation();
        setViewer((v) => ({ ...v, index: (v.index + 1) % v.images.length }));
    };

    // Read activeTab from URL query
    const params = new URLSearchParams(search);
    const activeTab = parseInt(params.get('activeTab') || '0');

    const [orgReports, setOrgReports] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchOrgs = async () => {
        try {
            const res = await organizationApi.getAll({ page: 1, size: 1000 });
            if (res.data?.status === 'success') {
                setOrganizations(res.data.data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch orgs:', err);
        }
    };

    const fetchPoints = async () => {
        try {
            const params = {};
            if (orgFilter) params.org_id = orgFilter;
            const response = await inundationApi.getPointsStatus(params);
            setPoints(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch points:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignedStation = async () => {
        if (isEmployee && userInfo?.assigned_pumping_station_id) {
            try {
                const response = await pumpingStationApi.get(userInfo.assigned_pumping_station_id);
                setAssignedStation(response.data.data || null);
            } catch (error) {
                console.error('Failed to fetch assigned station:', error);
            }
        }

        // Also fetch all stations if not restricted (admin or manager)
        if (!isEmployee || hasPermission('pumping_station:view_all')) {
            setLoadingPumpingStations(true);
            try {
                const response = await pumpingStationApi.list();
                setPumpingStations(response.data.data?.data || []);
            } catch (error) {
                console.error('Failed to fetch all pumping stations:', error);
            } finally {
                setLoadingPumpingStations(false);
            }
        }
    };

    const fetchOrgReports = async () => {
        setLoadingHistory(true);
        try {
            const res = await inundationApi.listReports(historyPage, historyRowsPerPage, {
                status: historyStatus,
                traffic_status: historyTrafficStatus,
                query: searchQuery,
                org_id: orgFilter
            });
            if (res.data?.status === 'success') {
                const result = res.data.data;
                setOrgReports(result.data || []);
                setTotalHistory(result.total || 0);
            }
        } catch {
            toast.error('Lỗi khi tải lịch sử báo cáo');
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, []);
    useEffect(() => {
        fetchPoints();
        fetchAssignedStation();
    }, [orgFilter, userInfo]);

    const fetchPumpingHistory = async () => {
        if (!userInfo?.assigned_pumping_station_id) return;
        setLoadingPumpingHistory(true);
        try {
            const response = await pumpingStationApi.getHistory(userInfo.assigned_pumping_station_id);
            setPumpingHistory(response.data.data?.data || []);
        } catch (error) {
            console.error('Failed to load pump history', error);
        } finally {
            setLoadingPumpingHistory(false);
        }
    };

    useEffect(() => {
        if (activeTab === 5) {
            fetchPumpingHistory();
        }
    }, [activeTab, userInfo]);

    useEffect(() => {
        if (activeTab === 3 || !isMobile) {
            fetchOrgReports();
        }
    }, [activeTab, historyPage, historyRowsPerPage, isMobile, historyStatus, historyTrafficStatus, searchQuery, orgFilter]);

    const stats = useMemo(() => {
        const total = points.length;
        const active = points.filter((p) => p.status === 'active').length;
        return { total, active, normal: total - active };
    }, [points]);

    const filteredPoints = useMemo(() => {
        let result = activeTab === 2 ? points.filter((p) => p.status === 'active') : points;

        if (historyStatus) {
            result = result.filter((p) => p.status === historyStatus);
        }

        if (historyTrafficStatus) {
            result = result.filter((p) => {
                const ts = p.active_report?.traffic_status || p.active_report?.trafficStatus;
                return ts === historyTrafficStatus;
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) => p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q));
        }
        return [...result].sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            return 0;
        });
    }, [points, activeTab, searchQuery, historyStatus, historyTrafficStatus]);



    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            logout();
            navigate('/pages/login', { replace: true });
        }
    };

    // ─── Render Logic ─────────────────────────────────────────────────────────

    const renderHistoryTable = () => (
        <Box>
            <Stack spacing={isMobile ? 2 : 1.5} sx={{ mb: 2 }}>
                <TextField
                    fullWidth
                    size={isMobile ? "medium" : "small"}
                    placeholder="Tìm tên đường, địa chỉ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <IconSearch size={20} sx={{ color: 'text.disabled', mr: 1, ml: 0.5 }} />,
                        sx: { borderRadius: 3, fontWeight: 600 }
                    }}
                />
                <Stack direction={isMobile ? "column" : "row"} spacing={isMobile ? 2 : 1}>
                    {organizations.length > 1 && (
                        <TextField
                            select
                            fullWidth
                            size={isMobile ? "medium" : "small"}
                            label="Đơn vị quản lý"
                            value={orgFilter}
                            onChange={(e) => {
                                setOrgFilter(e.target.value);
                                setHistoryPage(0);
                            }}
                            InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }}
                        >
                            <MenuItem value="">Tất cả đơn vị</MenuItem>
                            {organizations.map((org) => (
                                <MenuItem key={org.id} value={org.id}>
                                    {org.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                    <TextField
                        select
                        fullWidth
                        size={isMobile ? "medium" : "small"}
                        label="Trạng thái"
                        value={historyStatus}
                        onChange={(e) => {
                            setHistoryStatus(e.target.value);
                            setHistoryPage(0);
                        }}
                        InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }}
                    >
                        <MenuItem value="">Tất cả trạng thái</MenuItem>
                        <MenuItem value="active">Đang diễn biến</MenuItem>
                        <MenuItem value="resolved">Đã kết thúc</MenuItem>
                    </TextField>
                    {isMobile && (
                        <TextField
                            select
                            fullWidth
                            size="medium"
                            label="Tình trạng giao thông"
                            value={historyTrafficStatus}
                            onChange={(e) => {
                                setHistoryTrafficStatus(e.target.value);
                                setHistoryPage(0);
                            }}
                            InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }}
                        >
                            <MenuItem value="">Tất cả giao thông</MenuItem>
                            <MenuItem value="Đi lại bình thường">Bình thường</MenuItem>
                            <MenuItem value="Đi lại khó khăn">Khó khăn</MenuItem>
                            <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
                        </TextField>
                    )}
                </Stack>
                {!isMobile && (
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Giao thông"
                        value={historyTrafficStatus}
                        onChange={(e) => {
                            setHistoryTrafficStatus(e.target.value);
                            setHistoryPage(0);
                        }}
                        InputProps={{ sx: { borderRadius: 2 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="Đi lại bình thường">Bình thường</MenuItem>
                        <MenuItem value="Đi lại khó khăn">Khó khăn</MenuItem>
                        <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
                    </TextField>
                )}
            </Stack>
            {isMobile ? (
                <Stack spacing={2} sx={{ mb: 10 }}>
                    {loadingHistory ? [1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={140} sx={{ borderRadius: 3 }} />)
                        : orgReports.length === 0 ? (
                            <Box sx={{ py: 5, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                                <Typography color="text.secondary">Không có dữ liệu lịch sử</Typography>
                            </Box>
                        ) : orgReports.map((report) => (
                            <CollapsibleHistoryRow
                                key={report.id}
                                report={report}
                                organizations={organizations}
                                handleOpenViewer={handleOpenViewer}
                                navigate={navigate}
                                isMobile={isMobile}
                                basePath={basePath}
                                hasPermission={hasPermission}
                                isEmployee={isEmployee}
                            />
                        ))}
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={totalHistory}
                        rowsPerPage={historyRowsPerPage}
                        page={historyPage}
                        onPageChange={(e, p) => setHistoryPage(p)}
                        onRowsPerPageChange={(e) => { setHistoryRowsPerPage(parseInt(e.target.value, 10)); setHistoryPage(0); }}
                        labelRowsPerPage=""
                        sx={{ '.MuiTablePagination-selectLabel, .MuiTablePagination-input': { display: 'none' } }}
                    />
                </Stack>
            ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '& .MuiTableCell-root': { fontSize: { xs: '0.875rem' } } }}>
                    <Table sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell sx={{ fontWeight: 700 }}>Tuyến đường / Điểm</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Đơn vị quản lý</TableCell>
                                <TableCell sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Bắt đầu</TableCell>
                                <TableCell sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Cập nhật / Kết thúc</TableCell>
                                <TableCell sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Tổng thời gian</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingHistory ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : orgReports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        Không có dữ liệu lịch sử
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orgReports.map((report) => (
                                    <CollapsibleHistoryRow
                                        key={report.id}
                                        report={report}
                                        organizations={organizations}
                                        handleOpenViewer={handleOpenViewer}
                                        navigate={navigate}
                                        isMobile={isMobile}
                                        basePath={basePath}
                                        hasPermission={hasPermission}
                                        isEmployee={isEmployee}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={totalHistory}
                        rowsPerPage={historyRowsPerPage}
                        page={historyPage}
                        onPageChange={(e, p) => setHistoryPage(p)}
                        onRowsPerPageChange={(e) => {
                            setHistoryRowsPerPage(parseInt(e.target.value, 10));
                            setHistoryPage(0);
                        }}
                        labelRowsPerPage="Dòng mỗi trang:"
                    />
                </TableContainer>
            )}
        </Box>
    );

    const renderImageViewer = () => (
        <Dialog
            open={viewer.open}
            onClose={handleCloseViewer}
            maxWidth="lg"
            PaperProps={{ sx: { bgcolor: 'black', borderRadius: 4, overflow: 'hidden', position: 'relative' } }}
        >
            <IconButton
                onClick={handleCloseViewer}
                sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 10,
                    color: 'white',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                }}
            >
                <IconX size={20} />
            </IconButton>
            <DialogContent
                sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', position: 'relative' }}
            >
                {viewer.images.length > 1 && (
                    <>
                        <IconButton
                            onClick={handlePrev}
                            sx={{ position: 'absolute', left: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}
                        >
                            <IconChevronLeft size={32} />
                        </IconButton>
                        <IconButton
                            onClick={handleNext}
                            sx={{ position: 'absolute', right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}
                        >
                            <IconChevronRight size={32} />
                        </IconButton>
                    </>
                )}
                <Box
                    component="img"
                    src={getInundationImageUrl(viewer.images[viewer.index])}
                    sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
                />
                <Box sx={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
                    <Typography
                        sx={{
                            color: 'white',
                            bgcolor: 'rgba(0,0,0,0.5)',
                            display: 'inline-block',
                            px: 2,
                            py: 0.5,
                            borderRadius: 10,
                            fontSize: '0.85rem'
                        }}
                    >
                        {viewer.index + 1} / {viewer.images.length}
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );

    // desktop view
    if (!isMobile) {
        return (
            <MainCard
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant="h3">Điểm ngập</Typography>
                        <Stack direction="row" spacing={1}>
                            <Chip
                                label="Điểm trực"
                                variant={activeTab === 0 ? 'filled' : 'outlined'}
                                color="primary"
                                onClick={() => navigate(`${basePath}/inundation`)}
                                sx={{ fontWeight: 700 }}
                            />
                            <Chip
                                label="Lịch sử báo cáo"
                                variant={activeTab === 2 ? 'filled' : 'outlined'}
                                color="primary"
                                onClick={() => navigate(`${basePath}/inundation?activeTab=2`)}
                                sx={{ fontWeight: 700 }}
                            />
                        </Stack>
                    </Box>
                }
            >
                {activeTab === 2 ? (
                    renderHistoryTable()
                ) : (
                    <>
                        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                size="small"
                                placeholder="Tìm kiếm điểm ngập..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{ width: 260 }}
                                InputProps={{ startAdornment: <IconSearch size={16} sx={{ mr: 1, color: 'text.disabled' }} /> }}
                            />
                            {organizations.length > 1 && (
                                <TextField
                                    select
                                    size="small"
                                    label="Đơn vị quản lý"
                                    value={orgFilter}
                                    onChange={(e) => setOrgFilter(e.target.value)}
                                    sx={{ minWidth: 150 }}
                                >
                                    <MenuItem value="">Tất cả đơn vị</MenuItem>
                                    {organizations.map((org) => (
                                        <MenuItem key={org.id} value={org.id}>
                                            {org.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                            <TextField
                                select
                                size="small"
                                label="Trạng thái"
                                value={historyStatus}
                                onChange={(e) => setHistoryStatus(e.target.value)}
                                sx={{ minWidth: 150 }}
                            >
                                <MenuItem value="">Tất cả</MenuItem>
                                <MenuItem value="active">Đang ngập</MenuItem>
                                <MenuItem value="normal">Bình thường</MenuItem>
                            </TextField>
                            <TextField
                                select
                                size="small"
                                label="Giao thông"
                                value={historyTrafficStatus}
                                onChange={(e) => setHistoryTrafficStatus(e.target.value)}
                                sx={{ minWidth: 200 }}
                            >
                                <MenuItem value="">Tất cả giao thông</MenuItem>
                                <MenuItem value="Đi lại bình thường">Đi lại bình thường</MenuItem>
                                <MenuItem value="Đi lại khó khăn">Đi lại khó khăn</MenuItem>
                                <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
                            </TextField>
                            <Box sx={{ flexGrow: 1 }} />
                            {!loading && (
                                <Stack direction="row" spacing={1}>
                                    <Chip label={`Đang ngập: ${stats.active}`} size="small" color="error" sx={{ fontWeight: 600 }} />
                                    <Chip label={`Bình thường: ${stats.normal}`} size="small" color="success" sx={{ fontWeight: 600 }} />
                                </Stack>
                            )}
                        </Box>
                        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '& .MuiTableCell-root': { fontSize: { xs: '0.875rem' } } }}>
                            <Table sx={{ minWidth: isMobile ? 300 : 800 }}>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell sx={{ width: 40 }} />
                                        <TableCell sx={{ fontWeight: 700 }}>Điểm ngập</TableCell>
                                        {!isMobile && (
                                            <>
                                                <TableCell sx={{ fontWeight: 700, width: 250 }}>Đơn vị quản lý</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }} align="center">Giao thông</TableCell>
                                                <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">Thao tác</TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading
                                        ? [1, 2, 3].map((i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={isMobile ? 3 : 6}>
                                                    <Skeleton height={40} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                        : filteredPoints.map((point) => (
                                            <CollapsiblePointRow
                                                key={point.id}
                                                point={point}
                                                organizations={organizations}
                                                handleOpenViewer={handleOpenViewer}
                                                navigate={navigate}
                                                isMobile={isMobile}
                                                basePath={basePath}
                                                hasPermission={hasPermission}
                                                isEmployee={isEmployee}
                                            />
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
                {renderImageViewer()}
            </MainCard>
        );
    }

    // Mobile views
    if (activeTab === 1) {
        const urlParams = new URLSearchParams(search);
        const assignedStationId = urlParams.get('assignedStationId');
        const stationToReport = assignedStationId ? pumpingStations.find(s => s.id === assignedStationId) : assignedStation;

        return (
            <Box sx={{ px: isMobile ? 1.5 : 2, pt: 2, pb: 10 }}>
                {isEmployee && !assignedStationId ? (
                    assignedStation ? (
                        <PumpingStationReport station={assignedStation} />
                    ) : (
                        <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'error.lighter', borderRadius: 4, border: '1px solid', borderColor: 'error.light' }}>
                            <IconAlertTriangle size={48} color={theme.palette.error.main} style={{ marginBottom: 16 }} />
                            <Typography color="error.dark" variant="h4" sx={{ fontWeight: 900 }}>
                                Chưa được gán trạm bơm
                            </Typography>
                            <Typography color="error.main" variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
                                Vui lòng liên hệ quản lý để được phân công trạm bơm vận hành.
                            </Typography>
                        </Box>
                    )
                ) : (
                    <>
                        {stationToReport && assignedStationId ? (
                            <Box>
                                <Button 
                                    startIcon={<IconChevronLeft />} 
                                    onClick={() => navigate(`${basePath}/inundation?activeTab=1`)}
                                    sx={{ mb: 2, fontWeight: 800 }}
                                >
                                    Quay lại danh sách
                                </Button>
                                <PumpingStationReport station={stationToReport} />
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main' }}>
                                        Danh sách trạm bơm
                                    </Typography>
                                    <Badge badgeContent={pumpingStations.length} color="primary">
                                        <Avatar sx={{ bgcolor: 'primary.lighter', width: 40, height: 40 }}>
                                            <IconTools size={20} color={theme.palette.primary.main} />
                                        </Avatar>
                                    </Badge>
                                </Box>
                                <Stack spacing={1}>
                                    {loadingPumpingStations ? (
                                        [1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 4 }} />)
                                    ) : pumpingStations.length === 0 ? (
                                        <Typography sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>Không tìm thấy trạm bơm nào</Typography>
                                    ) : (
                                        pumpingStations.map(station => (
                                            <CollapsiblePumpingStationRow 
                                                key={station.id}
                                                station={station}
                                                isMobile={isMobile}
                                                navigate={navigate}
                                                basePath={basePath}
                                            />
                                        ))
                                    )}
                                </Stack>
                            </>
                        )}
                    </>
                )}
            </Box>
        );
    }

    if (activeTab === 3) {
        return (
            <Box sx={{ px: 2, pt: 2, pb: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h3" sx={{ fontWeight: 900 }}>
                        Lịch sử báo cáo
                    </Typography>
                </Box>
                {renderHistoryTable()}
                {renderImageViewer()}
            </Box>
        );
    }

    if (activeTab === 4) {
        return (
            <Box sx={{ px: isMobile ? 1.2 : 2, pt: 4, textAlign: 'center' }}>
                <Avatar sx={{ width: 96, height: 96, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                    <IconUser size={48} />
                </Avatar>
                <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5 }}>
                    {userInfo?.name || 'Cán bộ kỹ thuật'}
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                    {userInfo?.email || 'Phòng Thoát Nước Hà Nội'}
                </Typography>
                <List sx={{ bgcolor: 'background.paper', borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 2, overflow: 'hidden' }}>
                    <ListItem button onClick={() => navigate(`${basePath}/inundation?activeTab=3`)} sx={{ py: 2, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                        <ListItemIcon>
                            <IconHistory size={26} color={theme.palette.primary.main} />
                        </ListItemIcon>
                        <ListItemText primary="Lịch sử điểm ngập" primaryTypographyProps={{ fontWeight: 700 }} />
                        <IconChevronRight size={20} />
                    </ListItem>
                    {isEmployee && userInfo?.assigned_pumping_station_id && (
                        <ListItem button onClick={() => navigate(`${basePath}/inundation?activeTab=5`)} sx={{ py: 2 }}>
                            <ListItemIcon>
                                <IconTools size={26} color={theme.palette.success.main} />
                            </ListItemIcon>
                            <ListItemText primary="Lịch sử vận hành trạm" primaryTypographyProps={{ fontWeight: 700 }} />
                            <IconChevronRight size={20} />
                        </ListItem>
                    )}
                </List>

                <List sx={{ bgcolor: 'background.paper', borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 4, overflow: 'hidden' }}>
                    <ListItem button onClick={handleLogout} sx={{ color: 'error.main', py: 2 }}>
                        <ListItemIcon>
                            <IconLogout size={26} color={theme.palette.error.main} />
                        </ListItemIcon>
                        <ListItemText primary="Đăng xuất" primaryTypographyProps={{ fontWeight: 700 }} />
                        <IconChevronRight size={20} />
                    </ListItem>
                </List>
            </Box>
        );
    }

    if (activeTab === 5) {
        return (
            <Box sx={{
                px: isMobile ? 1.5 : 2,
                pt: 2,
                pb: 10,
                flexGrow: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <IconButton onClick={() => navigate(`${basePath}/inundation?activeTab=4`)} sx={{ mr: 1 }}>
                        <IconChevronLeft />
                    </IconButton>
                    <Typography variant="h3" sx={{ fontWeight: 900 }}>
                        Lịch sử vận hành trạm
                    </Typography>
                </Box>

                <Stack spacing={2}>
                    {loadingPumpingHistory ? (
                        [1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 3 }} />)
                    ) : (pumpingHistory || []).length === 0 ? (
                        <Box sx={{ py: 5, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 3 }}>
                            <Typography color="text.secondary">Chưa có dữ liệu lịch sử</Typography>
                        </Box>
                    ) : (
                        pumpingHistory.map((row) => (
                            <Paper key={row.id} elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'grey.100' }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                            {dayjs(row.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                        </Typography>
                                        {row.note && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                "{row.note}"
                                            </Typography>
                                        )}
                                    </Box>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled' }}>
                                        Bởi: {row.user_name}
                                    </Typography>
                                </Stack>
                                <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />
                                <Stack direction="row" spacing={1.5}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                                            VH: {row.operating_count}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                                            Đóng: {row.closed_count}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'warning.main' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                            BD: {row.maintenance_count}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        ))
                    )}
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ px: isMobile ? 1.2 : 2, pt: 2, pb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: -0.5 }}>
                    Điểm ngập
                </Typography>
                <Badge badgeContent={stats.active} color="error" max={99} overlap="circular">
                    <Avatar sx={{ bgcolor: 'error.lighter', width: 40, height: 40 }}>
                        <IconAlertTriangle size={20} color={theme.palette.error.main} />
                    </Avatar>
                </Badge>
            </Box>
            <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                <Chip
                    label={`Tất cả (${stats.total})`}
                    variant={activeTab === 0 ? 'filled' : 'outlined'}
                    color="primary"
                    onClick={() => navigate(`${basePath}/inundation?activeTab=0`)}
                    sx={{ fontWeight: 800, height: 36, fontSize: '0.95rem', flexShrink: 0 }}
                />
                <Chip
                    label="Trạm bơm"
                    variant={activeTab === 1 ? 'filled' : 'outlined'}
                    color="primary"
                    onClick={() => navigate(`${basePath}/inundation?activeTab=1`)}
                    sx={{ fontWeight: 800, height: 36, fontSize: '0.95rem', flexShrink: 0 }}
                />
                <Chip
                    label={`Đang ngập (${stats.active})`}
                    color="error"
                    variant={activeTab === 2 ? 'filled' : 'outlined'}
                    onClick={() => navigate(`${basePath}/inundation?activeTab=2`)}
                    sx={{ fontWeight: 800, height: 36, fontSize: '0.95rem', flexShrink: 0 }}
                />
            </Stack>
            <Stack spacing={isMobile ? 2 : 1.5} sx={{ mb: 2 }}>
                <TextField
                    fullWidth
                    size={isMobile ? "medium" : "small"}
                    placeholder="Tìm tên đường, địa chỉ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <IconSearch size={20} sx={{ color: 'text.disabled', mr: 1, ml: 0.5 }} />,
                        sx: { borderRadius: 3, fontWeight: 600 }
                    }}
                />
                <Stack direction={isMobile ? "column" : "row"} spacing={isMobile ? 2 : 1}>
                    {organizations.length > 1 && (
                        <TextField
                            select
                            fullWidth
                            size={isMobile ? "medium" : "small"}
                            label="Đơn vị quản lý"
                            value={orgFilter}
                            onChange={(e) => setOrgFilter(e.target.value)}
                            InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }}
                        >
                            <MenuItem value="">Tất cả đơn vị</MenuItem>
                            {organizations.map((org) => (
                                <MenuItem key={org.id} value={org.id}>
                                    {org.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                    <TextField
                        select
                        fullWidth
                        size={isMobile ? "medium" : "small"}
                        label="Trạng thái ngập"
                        value={historyStatus}
                        onChange={(e) => setHistoryStatus(e.target.value)}
                        InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }}
                    >
                        <MenuItem value="">Tất cả trạng thái</MenuItem>
                        <MenuItem value="active">Đang diễn biến</MenuItem>
                        <MenuItem value="normal">Bình thường</MenuItem>
                    </TextField>
                    {isMobile && (
                        <TextField
                            select
                            fullWidth
                            size="medium"
                            label="Tình trạng giao thông"
                            value={historyTrafficStatus}
                            onChange={(e) => setHistoryTrafficStatus(e.target.value)}
                            InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }}
                        >
                            <MenuItem value="">Tất cả giao thông</MenuItem>
                            <MenuItem value="Đi lại bình thường">Bình thường</MenuItem>
                            <MenuItem value="Đi lại khó khăn">Khó khăn</MenuItem>
                            <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
                        </TextField>
                    )}
                </Stack>
                {!isMobile && (
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Giao thông"
                        value={historyTrafficStatus}
                        onChange={(e) => setHistoryTrafficStatus(e.target.value)}
                        InputProps={{ sx: { borderRadius: 2 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="Đi lại bình thường">Bình thường</MenuItem>
                        <MenuItem value="Đi lại khó khăn">Khó khăn</MenuItem>
                        <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
                    </TextField>
                )}
            </Stack>
            {isMobile ? (
                <Stack spacing={2} sx={{ mb: 10 }}>
                    {loading ? [1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 3 }} />)
                        : filteredPoints.map((point) => (
                            <CollapsiblePointRow
                                key={point.id}
                                point={point}
                                organizations={organizations}
                                handleOpenViewer={handleOpenViewer}
                                navigate={navigate}
                                isMobile={isMobile}
                                basePath={basePath}
                                hasPermission={hasPermission}
                                isEmployee={isEmployee}
                            />
                        ))}
                </Stack>
            ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '& .MuiTableCell-root': { fontSize: { xs: '0.875rem' } } }}>
                    <Table sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell sx={{ fontWeight: 700 }}>Điểm ngập</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 250 }}>Đơn vị quản lý</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Giao thông</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading
                                ? [1, 2, 3].map((i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6}>
                                            <Skeleton height={40} />
                                        </TableCell>
                                    </TableRow>
                                ))
                                : filteredPoints.map((point) => (
                                    <CollapsiblePointRow
                                        key={point.id}
                                        point={point}
                                        organizations={organizations}
                                        handleOpenViewer={handleOpenViewer}
                                        navigate={navigate}
                                        isMobile={isMobile}
                                        basePath={basePath}
                                        hasPermission={hasPermission}
                                        isEmployee={isEmployee}
                                    />
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            {renderImageViewer()}
        </Box>
    );
};

export default InundationDashboard;
