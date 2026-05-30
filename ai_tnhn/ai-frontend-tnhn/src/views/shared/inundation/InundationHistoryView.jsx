import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Box, Typography, Stack, Chip, Paper, CircularProgress,
    Divider, alpha, Grid, useMediaQuery, Button
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconClock, IconLayoutList
} from '@tabler/icons-react';

import inundationApi from 'api/inundation';
import { getTrafficStatusColor } from 'utils/trafficStatusHelper';
import { formatDateTime } from 'utils/dataHelper';
import ImageViewer from '../../employee/inundation/components/ImageViewer';
import { getInundationImageUrl } from 'utils/imageHelper';

const InundationHistoryView = ({ pointId: propPointId, hideHeader = false }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [searchParams] = useSearchParams();
    const pointId = propPointId || searchParams.get('id');

    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [history, setHistory] = useState([]);
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });

    const loadHistory = useCallback(async (lastHistoryId = null) => {
        if (!pointId) {
            setHistory([]);
            setHasMore(false);
            setTotal(0);
            return;
        }

        const isLoadMore = !!lastHistoryId;
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const limit = 5;
            const response = await inundationApi.getPointHistory(pointId, lastHistoryId, limit);

            let dataArr = [];
            let totalCount = 0;
            if (response) {
                dataArr = Array.isArray(response) ? response : (response.data || response.items || []);
                totalCount = typeof response.total === 'number' ? response.total : dataArr.length;
            }

            setHistory(prev => {
                const combined = isLoadMore ? [...prev, ...dataArr] : dataArr;
                const merged = [];
                const seenIds = new Set();
                for (const item of combined) {
                    if (!seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        merged.push(item);
                    }
                }

                setHasMore(merged.length < totalCount);
                return merged;
            });
            setTotal(totalCount);
        } catch (err) {
            console.error('Failed to load history:', err);
            if (!isLoadMore) {
                setHistory([]);
                setHasMore(false);
                setTotal(0);
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [pointId]);

    useEffect(() => {
        if (pointId) {
            loadHistory();
        } else {
            setHistory([]);
            setHasMore(false);
            setTotal(0);
        }
    }, [pointId, loadHistory]);

    const handleOpenViewer = (images, index) => {
        setViewer({ open: true, images, index });
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={32} color="secondary" />
            </Box>
        );
    }

    if (!pointId) {
        return (
            <Box sx={{ py: 6, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                <Typography color="textSecondary" variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Vui lòng chọn một điểm ngập để xem lịch sử bản tin
                </Typography>
            </Box>
        );
    }

    if (history.length === 0) {
        return (
            <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 4 }}>
                <IconLayoutList size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
                <Typography color="textSecondary" sx={{ fontWeight: 700 }}>Chưa có dữ liệu lịch sử cho điểm ngập này</Typography>
            </Box>
        );
    }

    return (
        <Box>
            {!hideHeader && (
                <Paper
                    elevation={0}
                    sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        borderRadius: '16px 16px 0 0',
                        p: isMobile ? 2 : 3,
                        mb: 0,
                        textAlign: 'center'
                    }}
                >
                    <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                        Lịch sử điểm ngập
                    </Typography>
                </Paper>
            )}

            <Box sx={{
                bgcolor: 'white',
                p: isMobile ? 1.5 : 3,
                borderRadius: hideHeader ? 4 : '0 0 16px 16px',
                border: hideHeader ? 'none' : '1px solid',
                borderColor: 'grey.200',
                borderTop: 'none',
                position: 'relative'
            }}>
                {/* Visual timeline connector line */}
                <Box sx={{
                    position: 'absolute',
                    left: isMobile ? 12 : 20,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    bgcolor: 'grey.200',
                    zIndex: 1
                }} />

                {history.map((item, idx) => {
                    const trafficColor = getTrafficStatusColor(item.traffic_status);

                    let title = "Cập nhật diễn biến";
                    let badgeColor = "primary";
                    let badgeLabel = "Diễn biến";

                    if (item.role_permission === "inundation:enterprise_report") {
                        title = "Báo cáo XN của địa bàn";
                        badgeColor = "info";
                        badgeLabel = "Địa bàn";
                    } else if (item.role_permission === "inundation:report") {
                        title = "P.KT-CL báo cáo";
                        badgeColor = "secondary";
                        badgeLabel = "P.KT-CL";
                    } else if (item.role_permission === "inundation:survey") {
                        title = "Xí nghiệp Khảo sát thiết kế";
                        badgeColor = "success";
                        badgeLabel = "Khảo sát";
                    } else if (item.role_permission === "inundation:mechanic") {
                        title = "Xí nghiệp Cơ giới";
                        badgeColor = "warning";
                        badgeLabel = "Cơ giới";
                    } else if (item.role_permission === "inundation:review") {
                        title = "Nhận xét KT-CL";
                        badgeColor = "error";
                        badgeLabel = "P.KT-CL";
                    }

                    const isReview = item.role_permission === "inundation:review";

                    return (
                        <Box key={item.id} sx={{ position: 'relative', pl: isMobile ? 3.5 : 5, mb: idx === history.length - 1 ? 0 : 2, zIndex: 2 }}>
                            {/* Dot indicator */}
                            <Box sx={{
                                position: 'absolute',
                                left: isMobile ? 5 : 13,
                                top: 12,
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                bgcolor: 'white',
                                border: '3px solid',
                                borderColor: `${badgeColor}.main`,
                                boxShadow: theme.shadows[2],
                                zIndex: 3
                            }} />

                            <Paper variant="outlined" sx={{ p: isMobile ? 1.25 : 2, borderRadius: 3, bgcolor: item.needs_correction ? alpha(theme.palette.error.main, 0.02) : 'white' }}>
                                {(() => {
                                    const hasImages = item.images && item.images.length > 0;
                                    return (
                                        <Grid container spacing={2}>
                                            {/* Column 1: Metadata & Creator info */}
                                            <Grid item xs={12} md={hasImages ? 4 : 5} sx={{ borderRight: { md: '1px dashed' }, borderColor: { md: 'divider' }, pr: { md: 2 } }}>
                                                <Stack spacing={0.75}>
                                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                        <Chip
                                                            size="small"
                                                            label={badgeLabel}
                                                            color={badgeColor}
                                                            sx={{ fontWeight: 900, borderRadius: 1.5 }}
                                                        />
                                                        <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <IconClock size={14} />
                                                            {formatDateTime(item.created_at)}
                                                        </Typography>
                                                    </Stack>

                                                    <Typography variant="h4" sx={{ fontWeight: 900, color: `${badgeColor}.dark`, fontSize: '1rem' }}>
                                                        {title}
                                                    </Typography>

                                                    <Divider sx={{ opacity: 0.5 }} />

                                                    <Stack spacing={0.25}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.825rem' }}>
                                                            👤 {item.user_name || "Hệ thống"}
                                                        </Typography>
                                                        {item.user_email && (
                                                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.725rem' }}>
                                                                ✉️ {item.user_email}
                                                            </Typography>
                                                        )}
                                                        {item.org_name && (
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.725rem' }}>
                                                                🏢 {item.org_name}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </Stack>
                                            </Grid>

                                            {/* Column 2: Update details and parameters */}
                                            <Grid item xs={12} md={hasImages ? 5 : 7} sx={{ borderRight: { md: hasImages ? '1px dashed' : 'none' }, borderColor: { md: 'divider' }, pr: { md: hasImages ? 2 : 0 }, pl: { md: 1.5 } }}>
                                                <Stack spacing={1.25}>
                                                    {/* Note / Remarks */}
                                                    {(item.note || item.review_comment) && (
                                                        <Box sx={{ p: 1.25, bgcolor: alpha(theme.palette.grey[100], 0.6), borderRadius: 2, borderLeft: '3px solid', borderColor: `${badgeColor}.main` }}>
                                                            <Typography variant="body2" sx={{ fontStyle: 'italic', fontWeight: 600, color: 'text.secondary', lineHeight: 1.5, fontSize: '0.825rem' }}>
                                                                "{item.note || item.review_comment}"
                                                            </Typography>
                                                        </Box>
                                                    )}

                                                    {/* Technical dimensions & status dashboard */}
                                                    {!isReview && (
                                                        <Box>
                                                            <Grid container spacing={1}>
                                                                <Grid item xs={6}>
                                                                    <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', borderRadius: 2, bgcolor: 'grey.50', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                                        <Typography variant="caption" color="textSecondary" display="block" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>📏 DxRxS</Typography>
                                                                        <Typography variant="subtitle2" sx={{ fontWeight: 900, mt: 0.25, fontSize: '0.8rem' }}>
                                                                            {item.length || '?'} x {item.width || '?'} x <span style={{ color: theme.palette.error.main, fontWeight: 900 }}>{item.depth || 0}</span>
                                                                        </Typography>
                                                                    </Paper>
                                                                </Grid>

                                                                <Grid item xs={6}>
                                                                    <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', borderRadius: 2, bgcolor: alpha(item.depth > 0 ? theme.palette.error.main : theme.palette.success.main, 0.05), height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                                                        <Typography variant="caption" color="textSecondary" display="block" sx={{ fontWeight: 700, fontSize: '0.65rem', mb: 0.25 }}>🌊 Trạng thái</Typography>
                                                                        <Chip
                                                                            size="small"
                                                                            label={item.flood_level_name || (item.depth > 0 ? "Ngập" : "Bình thường")}
                                                                            sx={{
                                                                                fontWeight: 900,
                                                                                bgcolor: item.flood_level_color || (item.depth > 0 ? 'error.main' : 'success.main'),
                                                                                color: 'white',
                                                                                fontSize: '0.7rem',
                                                                                height: 18
                                                                            }}
                                                                        />
                                                                    </Paper>
                                                                </Grid>
                                                            </Grid>
                                                        </Box>
                                                    )}
                                                </Stack>
                                            </Grid>

                                            {/* Column 3: Images/Gallery (Far Right Box) */}
                                            {hasImages && (
                                                <Grid item xs={12} md={3} sx={{ pl: { md: 1.5 } }}>
                                                    <Paper variant="outlined" sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', bgcolor: alpha(theme.palette.grey[100], 0.3), borderRadius: 2 }}>
                                                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 800, mb: 0.75, display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>📸 Hình ảnh ({item.images.length})</Typography>
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', alignItems: 'center' }}>
                                                            {item.images.slice(0, 6).map((img, imgIdx) => {
                                                                const count = item.images.length;
                                                                const isLastToShow = imgIdx === 5 && count > 6;

                                                                return (
                                                                    <Box key={imgIdx} sx={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                                                                        <Box
                                                                            component="img"
                                                                            src={getInundationImageUrl(img)}
                                                                            onClick={() => handleOpenViewer(item.images, imgIdx)}
                                                                            sx={{
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                objectFit: 'cover',
                                                                                borderRadius: 1,
                                                                                cursor: 'pointer',
                                                                                border: '1px solid',
                                                                                borderColor: 'grey.200',
                                                                                opacity: isLastToShow ? 0.4 : 1,
                                                                                transition: 'transform 0.2s',
                                                                                '&:hover': {
                                                                                    transform: 'scale(1.05)',
                                                                                    borderColor: 'primary.main'
                                                                                }
                                                                            }}
                                                                        />
                                                                        {isLastToShow && (
                                                                            <Box
                                                                                onClick={() => handleOpenViewer(item.images, 5)}
                                                                                sx={{
                                                                                    position: 'absolute',
                                                                                    top: 0,
                                                                                    left: 0,
                                                                                    right: 0,
                                                                                    bottom: 0,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    cursor: 'pointer',
                                                                                    fontSize: '0.85rem',
                                                                                    fontWeight: 900,
                                                                                    color: 'white',
                                                                                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                                                                                    borderRadius: 1
                                                                                }}
                                                                            >
                                                                                +{count - 5}
                                                                            </Box>
                                                                        )}
                                                                    </Box>
                                                                );
                                                            })}
                                                        </Box>
                                                    </Paper>
                                                </Grid>
                                            )}
                                        </Grid>
                                    );
                                })()}
                            </Paper>
                        </Box>
                    );
                })}
            </Box>

            {hasMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 1 }}>
                    <Button
                        disabled={loadingMore}
                        variant="outlined"
                        color="primary"
                        onClick={() => {
                            const lastItem = history[history.length - 1];
                            loadHistory(lastItem?.id);
                        }}
                        startIcon={loadingMore ? <CircularProgress size={16} color="inherit" /> : null}
                        sx={{ fontWeight: 800, borderRadius: 2, px: 4 }}
                    >
                        {loadingMore ? 'Đang tải...' : 'Xem thêm lịch sử'}
                    </Button>
                </Box>
            )}

            <ImageViewer
                viewer={viewer}
                onClose={() => setViewer(v => ({ ...v, open: false }))}
                onPrev={() => setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }))}
                onNext={() => setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length }))}
            />
        </Box>
    );
};

export default InundationHistoryView;
