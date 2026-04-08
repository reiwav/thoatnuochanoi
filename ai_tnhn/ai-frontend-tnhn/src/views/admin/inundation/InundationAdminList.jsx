import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, Stack, TextField, MenuItem,
    CircularProgress, Button, InputAdornment, TablePagination, Skeleton,
    Dialog, DialogContent, IconButton, Collapse, useTheme, useMediaQuery, Grid
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { IconSearch, IconClock, IconAlertTriangle, IconX, IconChevronLeft, IconChevronRight, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import inundationApi from 'api/inundation';
import organizationApi from 'api/organization';
import { getInundationImageUrl } from 'utils/imageHelper';
import { getTrafficStatusColor, getTrafficStatusLabel } from 'utils/trafficStatusHelper';
import { toast } from 'react-hot-toast';

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

        return {
            ...data,
            depth: updateWithDimensions?.depth || data.depth,
            length: updateWithDimensions?.length || data.length,
            width: updateWithDimensions?.width || data.width,
            traffic_status: (updateWithTraffic?.traffic_status || updateWithTraffic?.trafficStatus) || data.traffic_status,
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

const CollapsiblePointRow = ({ point, organizations, formatTime, getDuration, handleOpenViewer, navigate, isMobile, fetchPoints }) => {
    const [open, setOpen] = useState(point.status === 'active');
    const latest = useMemo(() => getLatestData(point.active_report || point.last_report), [point]);
    const [commentInput, setCommentInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const role = localStorage.getItem('role');

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
                                    <Typography variant="caption" color="text.secondary" display="block">Cập nhật:</Typography>
                                    <Typography variant="caption" color={point.status === 'active' ? "error" : "text.secondary"} sx={{ fontWeight: 700 }}>
                                        {point.status === 'active'
                                            ? `${formatTime(latest?.newest_ts)} (${!latest?.oldest_ts || Number(latest?.oldest_ts) === Number(latest?.newest_ts) ? '00' : getDuration(latest?.oldest_ts, latest?.newest_ts)})`
                                            : `${getDuration(point.start_time || latest?.start_time, point.end_time || latest?.end_time)}`}
                                    </Typography>
                                </Grid>
                            </Grid>

                            {latest?.updates?.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>LỊCH SỬ CẬP NHẬT:</Typography>
                                    <Stack spacing={1}>
                                        {latest.updates.slice(0, 3).sort((a, b) => b.timestamp - a.timestamp).map((upd, idx) => (
                                            <Box key={idx} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>{formatTime(upd.timestamp)}</Typography>
                                                    {(upd.traffic_status || upd.trafficStatus) && (
                                                        <Chip label={getTrafficStatusLabel(upd.traffic_status || upd.trafficStatus)} size="small" color={getTrafficStatusColor(upd.traffic_status || upd.trafficStatus)} variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                                                    )}
                                                </Stack>
                                                <Typography variant="body2" sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}>{upd.description || 'Không có mô tả'}</Typography>
                                                {upd.review_comment && (
                                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'error.main', fontStyle: 'italic', fontWeight: 600 }}>
                                                        Reviewer: {upd.review_comment}
                                                    </Typography>
                                                )}
                                                {upd.old_data?.length > 0 && (
                                                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Dữ liệu cũ:</Typography>
                                                        {upd.old_data.map((old, oIdx) => (
                                                            <Typography key={oIdx} variant="caption" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                                                • {old.description || 'N/A'} ({old.depth}m)
                                                            </Typography>
                                                        ))}
                                                    </Box>
                                                )}
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            )}

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
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
                <TableCell sx={{ width: 40, p: { xs: 1, md: 2 } }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{point.name}</Typography>
                </TableCell>
                <TableCell><Typography variant="body2" color="primary">{point.org_name || organizations.find(o => o.id === point.org_id)?.name || ''}</Typography></TableCell>
                <TableCell><Chip label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'} color={point.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                <TableCell>{point.status === 'active' && latest?.traffic_status && <Chip label={getTrafficStatusLabel(latest.traffic_status)} size="small" color={getTrafficStatusColor(latest.traffic_status)} variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem' }} />}</TableCell>
                <TableCell align="right" sx={{ p: { xs: 1, md: 2 } }}>
                    <Button size="small" variant="text" onClick={() => navigate(`/admin/inundation/form?id=${point.active_report?.id || point.last_report_id}&tab=1&readonly=true`)}>Xem chi tiết</Button>
                </TableCell>
            </TableRow>
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
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Kích thước ngập:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {latest ? `${latest.length || 0}m x ${latest.width || 0}m x ${latest.depth || 0}m` : '-'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Thời gian ngập:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {`Bắt đầu: ${formatTime(point.start_time || latest?.start_time)}`}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {point.status === 'active' ? 'Đang diễn ra' : `Kết thúc: ${formatTime(point.end_time || latest?.end_time)}`}
                                        </Typography>
                                        <Typography variant="caption" color={point.status === 'active' ? "error" : "text.secondary"} sx={{ fontWeight: 600, display: 'block' }}>
                                            {point.status === 'active'
                                                ? `Cập nhật lúc: ${formatTime(latest?.newest_ts)} (${!latest?.oldest_ts || Number(latest?.oldest_ts) === Number(latest?.newest_ts) ? '00' : getDuration(latest?.oldest_ts, latest?.newest_ts)})`
                                                : `Tổng thời gian: ${getDuration(point.start_time || latest?.start_time, point.end_time || latest?.end_time)}`}
                                        </Typography>
                                    </Grid>
                                </Grid>

                                {latest?.review_comment && (
                                    <Box sx={{ mt: 1, p: 1.5, bgcolor: '#fff5f5', borderRadius: 2, border: '1px solid', borderColor: '#ffc1c1' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main', display: 'block', mb: 0.5 }}>NHẬN XÉT CỦA REVIEWER:</Typography>
                                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'error.dark', fontWeight: 600 }}>{latest.review_comment}</Typography>
                                    </Box>
                                )}

                                {role === 'reviewer' && point.status === 'active' && (
                                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>Gửi nhận xét cho nhân viên:</Typography>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={2}
                                            placeholder="Nhập nội dung cần yêu cầu sửa đổi..."
                                            value={commentInput}
                                            onChange={(e) => setCommentInput(e.target.value)}
                                            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: 'grey.50' } }}
                                        />
                                        <Stack direction="row" justifyContent="flex-end">
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                onClick={handleReview}
                                                disabled={isSubmitting || !commentInput.trim()}
                                                startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
                                            >
                                                Gửi nhận xét
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}

                                {latest?.updates?.length > 0 && (
                                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Lịch sử cập nhật:</Typography>
                                        <Stack spacing={1}>
                                            {latest.updates.slice().sort((a, b) => b.timestamp - a.timestamp).map((upd, idx) => (
                                                <Box key={idx} sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                                            {formatTime(upd.timestamp)}
                                                        </Typography>
                                                        {(upd.traffic_status || upd.trafficStatus) && (
                                                            <Chip
                                                                label={getTrafficStatusLabel(upd.traffic_status || upd.trafficStatus)}
                                                                size="small"
                                                                color={getTrafficStatusColor(upd.traffic_status || upd.trafficStatus)}
                                                                variant="outlined"
                                                                sx={{ height: 18, fontSize: '0.625rem' }}
                                                            />
                                                        )}
                                                    </Stack>
                                                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{upd.description || 'Không có mô tả'}</Typography>
                                                    {upd.review_comment && (
                                                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'error.main', fontStyle: 'italic', fontWeight: 600 }}>
                                                            Reviewer: {upd.review_comment}
                                                        </Typography>
                                                    )}
                                                    {upd.old_data?.length > 0 && (
                                                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Dữ liệu cũ:</Typography>
                                                            {upd.old_data.map((old, oIdx) => (
                                                                <Typography key={oIdx} variant="caption" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                                                    • {old.description || 'N/A'} ({old.depth}m)
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ảnh liên quan:</Typography>
                                    {latest?.images?.length > 0 ? (
                                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                                            {latest.images.map((img, idx) => (
                                                <Box key={idx} component="img" src={getInundationImageUrl(img)} onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.images, idx); }} sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'divider', flexShrink: 0 }} />
                                            ))}
                                        </Stack>
                                    ) : <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Không có ảnh</Typography>}
                                </Box>
                                {isMobile && (
                                    <Box sx={{ mt: 1, textAlign: 'right' }}>
                                        <Button size="small" variant="contained" color="primary" onClick={() => navigate(`/admin/inundation/form?id=${point.active_report?.id || point.last_report_id}&tab=1&readonly=true`)}>Xem chi tiết</Button>
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

const CollapsibleHistoryRow = ({ report, organizations, formatTime, getDuration, handleOpenViewer, navigate, isMobile, fetchHistory }) => {
    const [open, setOpen] = useState(report.status === 'active');
    const [commentInput, setCommentInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const role = localStorage.getItem('role');

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
                                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'primary.main' }}>Bắt đầu: {formatTime(report.start_time)}</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: report.status === 'active' ? 'error.main' : 'success.main' }}>
                                        {report.status === 'resolved' ? `Kết thúc: ${formatTime(report.end_time)}` : 'Đang ngập'}
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
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
                <TableCell sx={{ width: 40, p: { xs: 1, md: 2 } }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{report.street_name}</Typography>
                </TableCell>
                <TableCell><Typography variant="body2" color="primary">{organizations.find(o => o.id === report.org_id)?.name || report.org_id}</Typography></TableCell>
                <TableCell><Typography variant="body2">{formatTime(report.start_time)}</Typography></TableCell>
                <TableCell><Typography variant="body2">{report.end_time ? formatTime(report.end_time) : '-'}</Typography></TableCell>
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
                                        <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Bắt đầu:</strong> {formatTime(report.start_time)}</Typography>
                                    </Stack>
                                )}
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Thời gian ngập:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{`Bắt đầu: ${formatTime(report.start_time)}`}</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{report.status === 'resolved' ? `Kết thúc: ${formatTime(report.end_time)}` : 'Đang diễn ra'}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                                            Tổng thời gian: {(() => {
                                                if (report.status === 'active') {
                                                    const sortedUpdates = report.updates && report.updates.length > 0
                                                        ? [...report.updates].sort((a, b) => b.timestamp - a.timestamp)
                                                        : [];
                                                    const newest = sortedUpdates.length > 0 ? sortedUpdates[0].timestamp : report.start_time;
                                                    const oldest = sortedUpdates.length > 0 ? sortedUpdates[sortedUpdates.length - 1].timestamp : report.start_time;
                                                    return getDuration(oldest, newest);
                                                }
                                                return getDuration(report.start_time, report.end_time);
                                            })()}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Kích thước ngập:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{`${report.length || 0}m x ${report.width || 0}m x ${report.depth || 0}m`}</Typography>
                                    </Grid>
                                </Grid>
                                {report.updates?.length > 0 && (
                                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Lịch sử cập nhật:</Typography>
                                        <Stack spacing={1}>
                                            {report.updates.slice().sort((a, b) => b.timestamp - a.timestamp).map((upd, idx) => (
                                                <Box key={idx} sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                                            {formatTime(upd.timestamp)}
                                                        </Typography>
                                                        {(upd.traffic_status || upd.trafficStatus) && (
                                                            <Chip
                                                                label={getTrafficStatusLabel(upd.traffic_status || upd.trafficStatus)}
                                                                size="small"
                                                                color={getTrafficStatusColor(upd.traffic_status || upd.trafficStatus)}
                                                                variant="outlined"
                                                                sx={{ height: 18, fontSize: '0.625rem' }}
                                                            />
                                                        )}
                                                    </Stack>
                                                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{upd.description || 'Không có mô tả'}</Typography>
                                                    {upd.review_comment && (
                                                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'error.main', fontStyle: 'italic', fontWeight: 600 }}>
                                                            Reviewer: {upd.review_comment}
                                                        </Typography>
                                                    )}
                                                    {upd.old_data?.length > 0 && (
                                                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Dữ liệu cũ:</Typography>
                                                            {upd.old_data.map((old, oIdx) => (
                                                                <Typography key={oIdx} variant="caption" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                                                    • {old.description || 'N/A'} ({old.depth}m)
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
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

    const fetchPoints = async () => {
        setLoadingPoints(true);
        try {
            const params = {};
            if (orgFilter) params.org_id = orgFilter;
            const response = await inundationApi.getPointsStatus(params);
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
                query: searchQuery,
                org_id: orgFilter
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
        fetchOrgs();
    }, []);

    useEffect(() => {
        fetchPoints();
    }, [orgFilter]);

    useEffect(() => {
        if (activeTab === 1) fetchHistory();
    }, [activeTab, historyPage, historyRowsPerPage, statusFilter, trafficFilter, searchQuery, orgFilter]);

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

    const formatTime = (ts) => {
        if (!ts) return '-';
        return new Date(ts * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    };

    const getDuration = (startTime, endTime) => {
        if (!startTime) return '';
        const end = endTime || Math.floor(Date.now() / 1000);
        const diff = end - startTime;
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        return h > 0 ? `${h}h ${m}p` : `${m}p`;
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
                <Stack spacing={isMobile ? 2 : 1.5} sx={{ mb: 3 }}>
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
                        <TextField
                            select
                            fullWidth
                            size={isMobile ? "medium" : "small"}
                            label="Đơn vị quản lý"
                            value={orgFilter}
                            onChange={(e) => { setOrgFilter(e.target.value); setHistoryPage(0); }}
                            InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }}
                        >
                            <MenuItem value="">Tất cả đơn vị</MenuItem>
                            {organizations.map(org => (
                                <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            fullWidth
                            size={isMobile ? "medium" : "small"}
                            label="Trạng thái"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setHistoryPage(0); }}
                            InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }}
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
                        >
                            <MenuItem value="">Tất cả giao thông</MenuItem>
                            <MenuItem value="Đi lại bình thường">Bình thường</MenuItem>
                            <MenuItem value="Đi lại khó khăn">Khó khăn</MenuItem>
                            <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
                        </TextField>
                    </Stack>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            {activeTab === 0 ? `Hiển thị: ${filteredPoints.length} điểm` : `Tổng cộng: ${totalHistory} báo cáo`}
                        </Typography>
                    </Box>
                </Stack>
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
                                            formatTime={formatTime}
                                            getDuration={getDuration}
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
                                        <TableCell sx={{ fontWeight: 700, width: 250 }}>Đơn vị quản lý</TableCell>
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
                                                    formatTime={formatTime}
                                                    getDuration={getDuration}
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
                                            formatTime={formatTime}
                                            getDuration={getDuration}
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
                                        <TableCell sx={{ fontWeight: 700 }}>Bắt đầu</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Kết thúc</TableCell>
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
                                                    formatTime={formatTime}
                                                    getDuration={getDuration}
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
