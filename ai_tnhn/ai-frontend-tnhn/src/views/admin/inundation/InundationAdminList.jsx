import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, Stack, TextField, MenuItem,
    CircularProgress, Button, InputAdornment, TablePagination, Skeleton,
    Dialog, DialogContent, IconButton, Collapse, useTheme, useMediaQuery, Grid,
    Menu, ListItemIcon, ListItemText
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import {
    IconSearch, IconClock, IconAlertTriangle, IconX, IconChevronLeft, IconChevronRight,
    IconChevronUp, IconChevronDown, IconDotsVertical, IconPlus, IconEye, IconEdit, IconCheck,
    IconMessage2, IconSend
} from '@tabler/icons-react';
import inundationApi from 'api/inundation';
import organizationApi from 'api/organization';
import { getInundationImageUrl } from 'utils/imageHelper';
import { getTrafficStatusColor, getTrafficStatusLabel } from 'utils/trafficStatusHelper';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';
import { formatDateTime, formatDuration } from 'utils/dataHelper';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';

const getLatestData = (report) => {
    if (!report) return null;
    let data = {
        ...report,
        traffic_status: report.traffic_status || report.trafficStatus
    };

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

        // Find most recent updates for technical fields
        const surveyUpdate = sortedUpdates.find(u => u.survey_checked || u.survey_note || (u.survey_images && u.survey_images.length > 0));
        const mechUpdate = sortedUpdates.find(u => u.mech_checked || u.mech_note || u.mech_d || u.mech_r || u.mech_s || (u.mech_images && u.mech_images.length > 0));

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
            traffic_status: (data.status === 'resolved' || data.status === 'normal') ? "" : (updateWithTraffic?.traffic_status || updateWithTraffic?.trafficStatus || data.traffic_status),

            // Technical fields
            survey_checked: surveyUpdate ? surveyUpdate.survey_checked : data.survey_checked,
            survey_note: surveyUpdate ? surveyUpdate.survey_note : data.survey_note,
            survey_images: (surveyUpdate?.survey_images && surveyUpdate.survey_images.length > 0) ? surveyUpdate.survey_images : data.survey_images,
            survey_ts: surveyUpdate?.timestamp,

            mech_checked: mechUpdate ? mechUpdate.mech_checked : data.mech_checked,
            mech_note: mechUpdate ? mechUpdate.mech_note : data.mech_note,
            mech_d: mechUpdate ? mechUpdate.mech_d : data.mech_d,
            mech_r: mechUpdate ? mechUpdate.mech_r : data.mech_r,
            mech_s: mechUpdate ? mechUpdate.mech_s : data.mech_s,
            mech_images: (mechUpdate?.mech_images && mechUpdate.mech_images.length > 0) ? mechUpdate.mech_images : data.mech_images,
            mech_ts: mechUpdate?.timestamp
        };
    }

    // Default if no updates
    const startTime = data.start_time || data.startTime || 0;
    return {
        ...data,
        timestamp: startTime,
        newest_ts: startTime,
        oldest_ts: startTime,
        traffic_status: (data.status === 'resolved' || data.status === 'normal') ? "" : data.traffic_status,
        survey_ts: startTime,
        mech_ts: startTime
    };
};

const CollapsiblePointRow = ({ point, organizations, handleOpenViewer, navigate, isMobile, fetchPoints }) => {
    const [open, setOpen] = useState(point.status === 'active');
    const latest = useMemo(() => getLatestData(point.active_report || point.last_report), [point]);
    const [commentInput, setCommentInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Auth & Permissions
    const { user, isEmployee, isCompany, hasPermission } = useAuthStore();
    const canReview = useMemo(() => {
        if (isEmployee) return false;

        const isAllowedAll = isCompany || hasPermission('inundation:review');
        if (isAllowedAll) return true;

        const report = point.active_report || point.last_report;
        if (!report) return false;

        // Ownership
        if (report.org_id === user?.org_id) return true;

        // Shared Points
        const userOrg = organizations.find(o => o.id === user?.org_id);
        if (userOrg?.inundation_ids?.includes(report.point_id)) return true;

        return false;
    }, [user, isCompany, isEmployee, point, organizations]);
    const isReviewUpdated = useMemo(() => {
        const report = point.active_report || point.last_report;
        return report?.is_review_updated;
    }, [point]);

    const handleReview = async () => {
        if (!commentInput.trim()) return;
        setIsSubmitting(true);
        try {
            const reportId = point.active_report?.id || point.last_report_id;
            await inundationApi.reviewReport(reportId, commentInput);
            toast.success('Gửi nhận xét thành công');
            setCommentInput('');
            if (fetchPoints) fetchPoints();
        } catch (error) {
            toast.error('Lỗi khi gửi nhận xét');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isMobile) {
        return (
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.dark', lineHeight: 1.2, mb: 1.5 }}>{point.name}</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                <Chip
                                    label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'}
                                    color={point.status === 'active' ? 'error' : 'success'}
                                    size="small"
                                    sx={{ fontWeight: 800 }}
                                />
                                {point.status === 'active' && latest?.traffic_status && (
                                    <Chip
                                        label={getTrafficStatusLabel(latest.traffic_status)}
                                        size="small"
                                        color={getTrafficStatusColor(latest.traffic_status)}
                                        variant="outlined"
                                        sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                                    />
                                )}
                                {isReviewUpdated && (
                                    <Chip
                                        label="ĐÃ SỬA"
                                        size="small"
                                        sx={{
                                            fontWeight: 900,
                                            color: 'white',
                                            bgcolor: 'success.main',
                                            fontSize: '0.65rem',
                                            height: 20
                                        }}
                                    />
                                )}
                            </Stack>
                        </Box>
                        <IconButton size="small" onClick={() => setOpen(!open)} sx={{ mt: -0.5, mr: -0.5 }}>
                            {open ? <IconChevronUp size={24} /> : <IconChevronDown size={24} />}
                        </IconButton>
                    </Stack>

                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>ĐỊA CHỈ:</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.dark' }}>{point.address || '-'}</Typography>
                            </Box>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>ĐƠN VỊ QUẢN LÝ:</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 800, color: 'secondary.dark' }}>
                                    {point.org_name || organizations.find(o => o.id === point.org_id)?.name || '-'}
                                </Typography>
                            </Box>
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block">Kích thước:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {latest ? `${latest.length || 0}m x ${latest.width || 0}m x ${latest.depth || 0}m` : '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block">Bắt đầu:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {latest ? formatDateTime(latest.start_time) : '-'}
                                    </Typography>

                                    <Typography variant="caption" color="text.secondary" display="block">Cập nhật lúc:</Typography>
                                    <Typography variant="caption" color={point.status === 'active' ? "error" : "text.secondary"} sx={{ fontWeight: 700 }}>
                                        {point.status === 'active'
                                            ? `${formatDateTime(point.updated_at || latest?.newest_ts)}`
                                            : `Kết thúc: ${formatDateTime(point.end_time || latest?.end_time)}`}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', color: 'primary.main' }}>
                                        Tổng: {formatDuration(point.start_time || latest?.start_time, point.end_time || latest?.end_time)}
                                    </Typography>
                                </Grid>
                            </Grid>


                            {latest?.review_comment && (
                                <Box sx={{ mb: 2, p: 1, bgcolor: 'error.lighter', borderRadius: 1.5, border: '1px solid', borderColor: 'error.light' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main', display: 'block', mb: 0.5 }}>NHẬN XÉT TỪ REVIEWER:</Typography>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'error.dark', fontWeight: 500 }}>{latest.review_comment}</Typography>
                                </Box>
                            )}

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>HÌNH ẢNH:</Typography>
                                {latest?.images?.length > 0 ? (
                                    <Box sx={{ display: 'flex', gap: 1.2, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 4 } }}>
                                        {latest.images.map((img, idx) => (
                                            <Box key={idx} component="img" src={getInundationImageUrl(img)} onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.images, idx); }} sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', flexShrink: 0, border: '1px solid', borderColor: 'divider', cursor: 'zoom-in', transition: 'transform .2s', '&:hover': { transform: 'scale(1.02)' } }} />
                                        ))}
                                    </Box>
                                ) : <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Không có ảnh</Typography>}
                            </Box>

                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                size="large"
                                sx={{ borderRadius: 3, fontWeight: 700, py: 1 }}
                                onClick={() => navigate(`/admin/inundation/form?id=${point.active_report?.id || point.last_report_id}&tab=1&readonly=true`)}
                            >
                                Xem chi tiết báo cáo
                            </Button>
                        </Box>
                    </Collapse>
                </Stack>
            </Box>
        );
    }

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ width: 40, p: { xs: 1, md: 2 } }}>
                    {point.status === "active" && (
                        <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                            {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{point.name}</Typography>
                </TableCell>
                <TableCell><Typography variant="body2" color="primary">{point.org_name || organizations.find(o => o.id === point.org_id)?.name || ''}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{point.shared_org_ids?.map(id => organizations.find(o => o.id === id)?.name).filter(n => n).join(', ') || '-'}</Typography></TableCell>
                <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                        <Chip label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'} color={point.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} />
                    </Stack>
                </TableCell>
                <TableCell>{point.status === 'active' && latest?.traffic_status && <Chip label={getTrafficStatusLabel(latest.traffic_status)} size="small" color={getTrafficStatusColor(latest.traffic_status)} variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem' }} />}</TableCell>
                <TableCell align="right" sx={{ p: { xs: 1, md: 2 } }}>
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
                                <MenuItem onClick={() => { handleMenuClose(); navigate(`/admin/inundation/form?id=${point.report_id}&tab=1&readonly=true`); }}>
                                    <ListItemIcon><IconEye size={18} /></ListItemIcon>
                                    <ListItemText primary="Xem chi tiết" />
                                </MenuItem>
                                {canReview && (
                                    <MenuItem onClick={() => { handleMenuClose(); navigate(`/admin/inundation/form?id=${point.report_id}&tab=1`); }}>
                                        <ListItemIcon><IconEdit size={18} /></ListItemIcon>
                                        <ListItemText primary="Cập nhật tiến độ" />
                                    </MenuItem>
                                )}
                                {canReview && (
                                    <MenuItem
                                        sx={{ color: 'success.main' }}
                                        onClick={async () => {
                                            handleMenuClose();
                                            if (window.confirm('Xác nhận kết thúc ngập cho điểm này?')) {
                                                try {
                                                    await inundationApi.resolveReport(point.report_id);
                                                    toast.success('Đã kết thúc ngập');
                                                    if (fetchPoints) fetchPoints();
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
                            onClick={() => {
                                if (point.status === 'active') {
                                    navigate(`${basePath}/inundation/form?tab=1&id=${point.active_report.id}&name=${encodeURIComponent(point.name)}`);
                                } else {
                                    navigate(`/admin/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`);
                                }
                            }}
                            title="Tạo báo cáo mới"
                        >
                            <IconPlus size={20} />
                        </IconButton>
                    )}
                </TableCell>
            </TableRow>
            {point.status === "active" && (
                <TableRow>
                    <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', paddingBottom: 0, paddingTop: 0 }} colSpan={isMobile ? 2 : 6}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ m: { xs: 1, md: 2 }, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 700, color: 'primary.main', mb: 2, fontSize: { xs: '0.875rem', md: 'inherit' } }}>
                                    {point.address}
                                </Typography>
                                <Stack spacing={1.5}>
                                    {isMobile && (
                                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                            <Chip label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'} color={point.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} />
                                            {point.status === 'active' && latest?.traffic_status && (
                                                <Chip label={getTrafficStatusLabel(latest.traffic_status)} size="small" color={getTrafficStatusColor(latest.traffic_status)} variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem' }} />
                                            )}
                                        </Stack>
                                    )}
                                    {/* 3 VÙNG NGANG TỔNG HỢP */}
                                    <Grid container spacing={2}>
                                        {/* CỘT 1: THÔNG TIN CHUNG & RÀ SOÁT */}
                                        <Grid item xs={12} md={(hasPermission('inundation:mechanic') || isCompany) || (hasPermission('inundation:survey') || isCompany) ? 4 : 12}>
                                            <Box sx={{ p: 1.5, height: '100%', bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                        ℹ️ Thông tin & Rà soát
                                                    </Typography>
                                                    {isReviewUpdated && (
                                                        <Chip
                                                            label="ĐÃ SỬA"
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 900,
                                                                color: 'white',
                                                                bgcolor: 'success.main',
                                                                fontSize: '0.65rem',
                                                                height: 20,
                                                                borderRadius: 1
                                                            }}
                                                        />
                                                    )}
                                                </Stack>

                                                <Stack spacing={1.2}>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                            {latest ? `${latest.length || 0}m x ${latest.width || 0}m x ${latest.depth || 0}m` : '-'}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'error.main' }}>
                                                            Bắt đầu: {formatDateTime(point.start_time || latest?.start_time)}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'primary.main' }}>
                                                            Sơ kết: {formatDuration(point.start_time || latest?.start_time, point.end_time || latest?.end_time)}
                                                        </Typography>
                                                    </Box>

                                                    {latest?.images?.length > 0 && (
                                                        <Box>
                                                            <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', pb: 0.5 }}>
                                                                {latest.images.map((img, idx) => (
                                                                    <Box key={idx} component="img" src={getInundationImageUrl(img)} onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.images, idx); }} sx={{ width: 42, height: 42, borderRadius: 1, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'divider', flexShrink: 0 }} />
                                                                ))}
                                                            </Stack>
                                                        </Box>
                                                    )}

                                                    {latest?.review_comment && (
                                                        <Box sx={{ p: 1, bgcolor: 'error.lighter', borderRadius: 1.5, borderLeft: '3px solid', borderColor: 'error.main' }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main', display: 'block' }}>NHẬN XÉT:</Typography>
                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.dark', display: 'block' }}>{latest.review_comment}</Typography>
                                                        </Box>
                                                    )}
                                                </Stack>
                                            </Box>
                                        </Grid>

                                        {/* CỘT 2: CƠ GIỚI & HỖ TRỢ */}
                                        {(hasPermission('inundation:mechanic') || isCompany) && (
                                            <Grid item xs={12} md={(hasPermission('inundation:survey') || isCompany) ? 4 : 8}>
                                                <Box sx={{ p: 1.5, height: '100%', bgcolor: 'green.lighter', borderRadius: 2, border: '1px solid', borderColor: 'warning.main' }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, borderBottom: '1px solid', borderColor: 'warning.light', pb: 0.5 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="caption" color="green.dark" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
                                                                ⚙️ Cơ giới
                                                            </Typography>
                                                            {latest?.mech_checked && <Chip label="ĐÃ ỨNG TRỰC" size="small" color="success" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900 }} />}
                                                        </Box>
                                                        {latest?.mech_ts && (
                                                            <Typography variant="caption" sx={{ color: 'green.dark', fontWeight: 700 }}>
                                                                {formatDateTime(latest.mech_ts)}
                                                            </Typography>
                                                        )}
                                                    </Stack>

                                                    <Stack spacing={1.5}>
                                                        {(latest?.mech_d || latest?.mech_r || latest?.mech_s) && (
                                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                                <Chip
                                                                    label={<Box component="span">D: <Box component="span" sx={{ color: 'primary.main', fontWeight: 900 }}>{latest.mech_d || '-'}</Box></Box>}
                                                                    size="small"
                                                                    sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700, bgcolor: 'white', color: 'black', border: '1px solid', borderColor: 'warning.main' }}
                                                                />
                                                                <Chip
                                                                    label={<Box component="span">R: <Box component="span" sx={{ color: 'primary.main', fontWeight: 900 }}>{latest.mech_r || '-'}</Box></Box>}
                                                                    size="small"
                                                                    sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700, bgcolor: 'white', color: 'black', border: '1px solid', borderColor: 'warning.main' }}
                                                                />
                                                                <Chip
                                                                    label={<Box component="span">S: <Box component="span" sx={{ color: 'primary.main', fontWeight: 900 }}>{latest.mech_s || '-'}</Box></Box>}
                                                                    size="small"
                                                                    sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700, bgcolor: 'white', color: 'black', border: '1px solid', borderColor: 'warning.main' }}
                                                                />
                                                            </Box>
                                                        )}

                                                        <Box>
                                                            {latest?.mech_note ? (
                                                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'black', fontSize: '0.875rem', lineHeight: 1.4 }}>{latest.mech_note}</Typography>
                                                            ) : (
                                                                <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary', opacity: 0.8 }}>Chưa có thông tin cập nhật</Typography>
                                                            )}
                                                        </Box>

                                                        {latest?.mech_images?.length > 0 && (
                                                            <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                                                                {latest.mech_images.map((img, i) => (
                                                                    <Box key={i} component="img" src={getInundationImageUrl(img)} onClick={() => handleOpenViewer(latest.mech_images, i)} sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '2px solid', borderColor: 'warning.main', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                                                                ))}
                                                            </Box>
                                                        )}
                                                    </Stack>
                                                </Box>
                                            </Grid>
                                        )}

                                        {/* CỘT 3: XNTK */}
                                        {
                                            (hasPermission('inundation:survey') || isCompany) && (
                                                <Grid item xs={12} md={(hasPermission('inundation:mechanic') || isCompany) ? 4 : 8}>
                                                    <Box sx={{ p: 1.5, height: '100%', bgcolor: 'primary.lighter', borderRadius: 2, border: '1px solid', borderColor: 'primary.main' }}>
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, borderBottom: '1px solid', borderColor: 'primary.light', pb: 0.5 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
                                                                    ⚡️ XNTK
                                                                </Typography>
                                                                {latest?.survey_checked && <Chip label="ĐÃ KIỂM TRA" size="small" color="success" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900 }} />}
                                                            </Box>
                                                            {latest?.survey_ts && (
                                                                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                                                    {formatDateTime(latest.survey_ts)}
                                                                </Typography>
                                                            )}
                                                        </Stack>

                                                        <Stack spacing={1.5}>
                                                            <Box>
                                                                {latest?.survey_note ? (
                                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.dark', fontSize: '0.875rem', lineHeight: 1.4 }}>{latest.survey_note}</Typography>
                                                                ) : (
                                                                    <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'primary.main', opacity: 0.7 }}>Chưa có thông tin cập nhật</Typography>
                                                                )}
                                                            </Box>

                                                            {latest?.survey_images?.length > 0 && (
                                                                <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                                                                    {latest.survey_images.map((img, i) => (
                                                                        <Box key={i} component="img" src={getInundationImageUrl(img)} onClick={() => handleOpenViewer(latest.survey_images, i)} sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '2px solid', borderColor: 'primary.main', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                                                                    ))}
                                                                </Box>
                                                            )}
                                                        </Stack>
                                                    </Box>
                                                </Grid>
                                            )
                                        }
                                    </Grid >

                                    {canReview && point.status === 'active' && !latest?.needs_correction && (
                                        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <IconMessage2 size={18} /> Phòng KT-CL nhận xét:
                                            </Typography>
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={2}
                                                placeholder="Nhập nội dung cần yêu cầu đơn vị chỉnh sửa..."
                                                value={commentInput}
                                                onChange={(e) => setCommentInput(e.target.value)}
                                                sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: 'grey.50', borderRadius: 2 } }}
                                            />
                                            <Stack direction="row" justifyContent="flex-end">
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    size="small"
                                                    onClick={handleReview}
                                                    disabled={isSubmitting || !commentInput.trim()}
                                                    startIcon={isSubmitting ? <CircularProgress size={16} /> : <IconSend size={16} />}
                                                    sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
                                                >
                                                    Gửi phản hồi
                                                </Button>
                                            </Stack>
                                        </Box>
                                    )}

                                    {
                                        canReview && point.status === 'active' && latest?.needs_correction && (
                                            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'warning.lighter', borderRadius: 2, border: '1px solid', borderColor: 'warning.light', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <IconMessage2 size={20} color="darkorange" />
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                                                        Đã gửi nhận xét — Đang chờ nhân viên cập nhật
                                                    </Typography>
                                                    {latest?.review_comment && (
                                                        <Typography variant="caption" sx={{ color: 'warning.dark', fontStyle: 'italic', display: 'block', mt: 0.3 }}>
                                                            "{latest.review_comment}"
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        )
                                    }

                                    {
                                        isMobile && (
                                            <Box sx={{ mt: 1, textAlign: 'right' }}>
                                                <Button size="small" variant="contained" color="primary" onClick={() => navigate(`/admin/inundation/form?id=${point.active_report?.id || point.last_report_id}&tab=1&readonly=true`)}>Xem chi tiết</Button>
                                            </Box>
                                        )
                                    }
                                </Stack >
                            </Box >
                        </Collapse >
                    </TableCell >
                </TableRow >
            )}
        </React.Fragment >
    );
};

const CollapsibleHistoryRow = ({ report, organizations, handleOpenViewer, navigate, isMobile, fetchHistory }) => {
    const [open, setOpen] = useState(report.status === 'active');
    const [commentInput, setCommentInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auth & Permissions
    const { user, isEmployee, isCompany, hasPermission } = useAuthStore();
    const canReview = useMemo(() => {
        if (isEmployee) return false;

        const isAllowedAll = isCompany || hasPermission('inundation:review');
        if (isAllowedAll) return true;

        if (!report) return false;

        // Ownership
        if (report.org_id === user?.org_id) return true;

        // Shared Points
        const userOrg = organizations.find(o => o.id === user?.org_id);
        if (userOrg?.inundation_ids?.includes(report.point_id)) return true;

        return false;
    }, [user, isCompany, isEmployee, report, organizations]);

    const handleReview = async () => {
        if (!commentInput.trim()) return;
        setIsSubmitting(true);
        try {
            await inundationApi.reviewReport(report.id, commentInput);
            toast.success('Gửi nhận xét thành công');
            setCommentInput('');
            if (fetchHistory) fetchHistory();
        } catch (error) {
            toast.error('Lỗi khi gửi nhận xét');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isMobile) {
        return (
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.dark', lineHeight: 1.2, mb: 1.5 }}>{report.street_name}</Typography>
                            <Stack direction="row" spacing={1}>
                                <Chip
                                    label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'}
                                    color={report.status === 'active' ? 'error' : 'success'}
                                    size="small"
                                    sx={{ fontWeight: 800 }}
                                />
                            </Stack>
                        </Box>
                        <IconButton size="small" onClick={() => setOpen(!open)} sx={{ mt: -0.5, mr: -0.5 }}>
                            {open ? <IconChevronUp size={24} /> : <IconChevronDown size={24} />}
                        </IconButton>
                    </Stack>

                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>ĐƠN VỊ QUẢN LÝ:</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 800, color: 'secondary.dark' }}>
                                    {organizations.find(o => o.id === report.org_id)?.name || report.org_id}
                                </Typography>
                            </Box>
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>THỜI GIAN:</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'primary.main' }}>Bắt đầu: {formatDateTime(report.start_time)}</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: report.status === 'active' ? 'error.main' : 'success.main' }}>
                                        {report.status === 'resolved' ? `Kết thúc: ${formatDateTime(report.end_time)}` : `Cập nhật: ${formatDateTime(report.updated_at || report.timestamp)}`}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', color: 'secondary.main' }}>
                                        Tổng: {formatDuration(report.start_time, report.end_time)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>KÍCH THƯỚC:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{`${report.length || 0}m x ${report.width || 0}m x ${report.depth || 0}m`}</Typography>
                                </Grid>
                            </Grid>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>HÌNH ẢNH:</Typography>
                                {report.images?.length > 0 ? (
                                    <Box sx={{ display: 'flex', gap: 1.2, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 4 } }}>
                                        {report.images.map((img, idx) => (
                                            <Box key={idx} component="img" src={getInundationImageUrl(img)} onClick={(e) => { e.stopPropagation(); handleOpenViewer(report.images, idx); }} sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', flexShrink: 0, border: '1px solid', borderColor: 'divider', cursor: 'zoom-in', transition: 'transform .2s', '&:hover': { transform: 'scale(1.02)' } }} />
                                        ))}
                                    </Box>
                                ) : <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Không có ảnh</Typography>}
                            </Box>

                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                size="large"
                                sx={{ borderRadius: 3, fontWeight: 700, py: 1 }}
                                onClick={() => navigate(`/admin/inundation/form?id=${report.id}&tab=1&readonly=true`)}
                            >
                                Xem chi tiết
                            </Button>
                        </Box>
                    </Collapse>
                </Stack>
            </Box>
        );
    }

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ width: 40, p: { xs: 1, md: 2 } }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{report.street_name}</Typography>
                </TableCell>
                <TableCell><Typography variant="body2" color="primary">{organizations.find(o => o.id === report.org_id)?.name || report.org_id}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{report.shared_org_ids?.map(id => organizations.find(o => o.id === id)?.name).filter(n => n).join(', ') || '-'}</Typography></TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDateTime(report.start_time)}</Typography>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{report.status === 'resolved' ? formatDateTime(report.end_time) : formatDateTime(report.updated_at || report.timestamp)}</Typography>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDuration(report.start_time, report.end_time)}</Typography>
                </TableCell>
                <TableCell><Chip label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'} color={report.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                <TableCell align="right" sx={{ p: { xs: 1, md: 2 } }}>
                    <Button size="small" variant="text" onClick={() => navigate(`/admin/inundation/form?id=${report.id}&tab=1&readonly=true`)}>Xem chi tiết</Button>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', paddingBottom: 0, paddingTop: 0 }} colSpan={isMobile ? 2 : 6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: { xs: 1, md: 2 }, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 700, color: 'primary.main', mb: 2, fontSize: { xs: '0.875rem', md: 'inherit' } }}>
                                Chi tiết báo cáo
                            </Typography>
                            <Stack spacing={1.5}>
                                {isMobile && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                        <Chip label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'} color={report.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} />
                                        <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Bắt đầu:</strong> {formatDateTime(report.start_time)}</Typography>
                                    </Stack>
                                )}
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Thời gian ngập:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{`Bắt đầu: ${formatDateTime(report.start_time)}`}</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{report.status === 'resolved' ? `Kết thúc: ${formatDateTime(report.end_time)}` : `Cập nhật: ${formatDateTime(report.updated_at || report.timestamp)}`}</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mt: 0.5, color: 'primary.main' }}>
                                            Tổng thời gian: {formatDuration(report.start_time, report.end_time)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Kích thước ngập:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{`${report.length || 0}m x ${report.width || 0}m x ${report.depth || 0}m`}</Typography>
                                    </Grid>
                                </Grid>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ảnh liên quan:</Typography>
                                    {report.images?.length > 0 ? (
                                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                                            {report.images.map((img, idx) => (
                                                <Box key={idx} component="img" src={getInundationImageUrl(img)} onClick={(e) => { e.stopPropagation(); handleOpenViewer(report.images, idx); }} sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'divider', flexShrink: 0 }} />
                                            ))}
                                        </Stack>
                                    ) : <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Không có ảnh</Typography>}
                                </Box>
                                {isMobile && (
                                    <Box sx={{ mt: 1, textAlign: 'right' }}>
                                        <Button size="small" variant="contained" color="primary" onClick={() => navigate(`/admin/inundation/form?id=${report.id}&tab=1&readonly=true`)}>Xem chi tiết</Button>
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

const InundationAdminList = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [activeTab, setActiveTab] = useState(0); // 0 = Điểm trực, 1 = Lịch sử báo cáo

    // Orgs
    const [organizations, setOrganizations] = useState([]);
    const [orgFilter, setOrgFilter] = useState('');

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

    const fetchOrgs = async () => {
        try {
            const res = await organizationApi.getAll({ page: 1, size: 1000 });
            if (res.data?.status === 'success') {
                setOrganizations(res.data.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch orgs:', error);
        }
    };

    const fetchPoints = async (silent = false) => {
        if (!silent) setLoadingPoints(true);
        try {
            const params = {};
            if (orgFilter) params.org_id = orgFilter;
            const response = await inundationApi.getPointsStatus(params);
            setPoints(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch points:', error);
        } finally {
            if (!silent) setLoadingPoints(false);
        }
    };

    const fetchHistory = async (silent = false) => {
        if (!silent) setLoadingHistory(true);
        try {
            const res = await inundationApi.listReports(historyPage, historyRowsPerPage, {
                status: statusFilter,
                traffic_status: trafficFilter,
                query: searchQuery,
                org_id: orgFilter
            });
            if (res.data?.status === 'success') {
                setHistoryReports(res.data.data.data || []);
                setTotalHistory(res.data.data.total || 0);
            }
        } catch (error) {
            if (!silent) toast.error('Lỗi khi tải lịch sử báo cáo');
        } finally {
            if (!silent) setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, []);

    useEffect(() => {
        fetchPoints();
    }, [orgFilter]);

    useEffect(() => {
        if (activeTab === 1) fetchHistory();
    }, [activeTab, historyPage, historyRowsPerPage, statusFilter, trafficFilter, searchQuery, orgFilter]);

    // Khởi tạo interval cập nhật tự động 5s
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTab === 0) {
                fetchPoints(true);
            } else if (activeTab === 1) {
                fetchHistory(true);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [activeTab, orgFilter, historyPage, historyRowsPerPage, statusFilter, trafficFilter, searchQuery]);

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
        return [...result].sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            return 0;
        });
    }, [points, searchQuery, statusFilter, trafficFilter]);



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
                        <Typography variant="h3" sx={{ fontWeight: 800 }}>## Cập nhật điểm ngập</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <Chip label="Điểm trực" variant={activeTab === 0 ? 'filled' : 'outlined'} color="primary" onClick={() => setActiveTab(0)} sx={{ fontWeight: 700, cursor: 'pointer' }} />
                        <Chip label="Lịch sử báo cáo" variant={activeTab === 1 ? 'filled' : 'outlined'} color="primary" onClick={() => setActiveTab(1)} sx={{ fontWeight: 700, cursor: 'pointer' }} />
                    </Stack>
                </Box>
            }
        >
            <Box sx={{ mb: 3 }}>
                <Stack direction={isMobile ? "column" : "row"} spacing={1} alignItems="center">
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
                        sx={{ flex: 1 }}
                    />
                    <OrganizationSelect
                        value={orgFilter}
                        allowAny
                        onChange={(e) => { setOrgFilter(e.target.value); setHistoryPage(0); }}
                        sx={{ width: { xs: '100%', sm: 220 } }}
                    />

                    <TextField
                        select
                        fullWidth
                        size={isMobile ? "medium" : "small"}
                        label="Trạng thái"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setHistoryPage(0); }}
                        InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }}
                        sx={{ width: { xs: '100%', sm: 180 } }}
                    >
                        <MenuItem value="">Tất cả trạng thái</MenuItem>
                        <MenuItem value="active">Đang ngập</MenuItem>
                        {activeTab === 0 ? <MenuItem value="normal">Bình thường</MenuItem> : <MenuItem value="resolved">Đã kết thúc</MenuItem>}
                    </TextField>

                    <TextField
                        select
                        fullWidth
                        size={isMobile ? "medium" : "small"}
                        label="Giao thông"
                        value={trafficFilter}
                        onChange={(e) => { setTrafficFilter(e.target.value); setHistoryPage(0); }}
                        InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }}
                        sx={{ width: { xs: '100%', sm: 180 } }}
                    >
                        <MenuItem value="">Tất cả giao thông</MenuItem>
                        <MenuItem value="Đi lại bình thường">Bình thường</MenuItem>
                        <MenuItem value="Đi lại khó khăn">Khó khăn</MenuItem>
                        <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
                    </TextField>
                </Stack>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {activeTab === 0 ? `Hiển thị: ${filteredPoints.length} điểm` : `Tổng cộng: ${totalHistory} báo cáo`}
                    </Typography>
                </Box>
            </Box>

            {/* Section 1: Điểm trực */}
            {activeTab === 0 && (
                <>
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>Danh sách điểm trực</Typography>
                    {isMobile ? (
                        <Stack spacing={2} sx={{ mb: 4 }}>
                            {loadingPoints ? [1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={140} sx={{ borderRadius: 3 }} />) :
                                filteredPoints.length === 0 ? <Box sx={{ py: 5, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}><Typography color="text.secondary">Trống</Typography></Box> :
                                    filteredPoints.map(point => (
                                        <CollapsiblePointRow
                                            key={point.id}
                                            point={point}
                                            organizations={organizations}
                                            handleOpenViewer={handleOpenViewer}
                                            navigate={navigate}
                                            isMobile={isMobile}
                                            fetchPoints={fetchPoints}
                                        />
                                    ))
                            }
                        </Stack>
                    ) : (
                        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 4, '& .MuiTableCell-root': { fontSize: { xs: '0.875rem' } } }}>
                            <Table sx={{ minWidth: 800 }}>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell sx={{ width: 40 }} />
                                        <TableCell sx={{ fontWeight: 700 }}>Điểm ngập</TableCell>
                                        <TableCell sx={{ fontWeight: 700, width: 200 }}>Đơn vị quản lý</TableCell>
                                        <TableCell sx={{ fontWeight: 700, width: 250 }}>Xí nghiệp phối hợp</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="center">Giao thông</TableCell>
                                        <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loadingPoints ? [1, 2, 3].map(i => <TableRow key={i}><TableCell colSpan={6}><Skeleton height={40} /></TableCell></TableRow>) :
                                        filteredPoints.length === 0 ? <TableRow><TableCell colSpan={6} align="center">Trống</TableCell></TableRow> :
                                            filteredPoints.map(point => (
                                                <CollapsiblePointRow
                                                    key={point.id}
                                                    point={point}
                                                    organizations={organizations}
                                                    handleOpenViewer={handleOpenViewer}
                                                    navigate={navigate}
                                                    isMobile={isMobile}
                                                    fetchPoints={fetchPoints}
                                                />
                                            ))
                                    }
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </>
            )}

            {/* Section 2: Lịch sử báo cáo */}
            {activeTab === 1 && (
                <>
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>Lịch sử báo cáo toàn thành phố</Typography>
                    {isMobile ? (
                        <Stack spacing={2} sx={{ mb: 10 }}>
                            {loadingHistory ? [1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={140} sx={{ borderRadius: 3 }} />) :
                                historyReports.length === 0 ? <Box sx={{ py: 5, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}><Typography color="text.secondary">Trống</Typography></Box> :
                                    historyReports.map(report => (
                                        <CollapsibleHistoryRow
                                            key={report.id}
                                            report={report}
                                            organizations={organizations}
                                            handleOpenViewer={handleOpenViewer}
                                            navigate={navigate}
                                            isMobile={isMobile}
                                            fetchHistory={fetchHistory}
                                        />
                                    ))
                            }
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
                                        <TableCell sx={{ fontWeight: 700 }}>Xí nghiệp phối hợp</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Bắt đầu</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Cập nhật / Kết thúc</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Tổng thời gian</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loadingHistory ? [1, 2, 3].map(i => <TableRow key={i}><TableCell colSpan={7}><Skeleton height={40} /></TableCell></TableRow>) :
                                        historyReports.length === 0 ? <TableRow><TableCell colSpan={7} align="center">Trống</TableCell></TableRow> :
                                            historyReports.map(report => (
                                                <CollapsibleHistoryRow
                                                    key={report.id}
                                                    report={report}
                                                    organizations={organizations}
                                                    handleOpenViewer={handleOpenViewer}
                                                    navigate={navigate}
                                                    isMobile={isMobile}
                                                    fetchHistory={fetchHistory}
                                                />
                                            ))
                                    }
                                </TableBody>
                            </Table>
                            <TablePagination rowsPerPageOptions={[10, 25, 50]} component="div" count={totalHistory} rowsPerPage={historyRowsPerPage} page={historyPage} onPageChange={(e, p) => setHistoryPage(p)} onRowsPerPageChange={(e) => { setHistoryRowsPerPage(parseInt(e.target.value, 10)); setHistoryPage(0); }} labelRowsPerPage="Dòng mỗi trang:" />
                        </TableContainer>
                    )}
                </>
            )}
            {renderImageViewer()}
        </MainCard>
    );
};

export default InundationAdminList;
