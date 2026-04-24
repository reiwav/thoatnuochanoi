import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Typography, Stack, Grid,
    IconButton, alpha, Paper, Chip, List, ListItemButton, Divider,
    CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconX, IconCalendarEvent, IconClock, IconRuler, IconCar,
    IconLayoutList, IconArrowRight
} from '@tabler/icons-react';
import dayjs from 'dayjs';

import inundationApi from 'api/inundation';
import { formatDateTime } from 'utils/dataHelper';
import { getDataArray } from 'utils/apiHelper';
import { getLatestData } from 'utils/inundationUtils';
import { getTrafficStatusColor } from 'utils/trafficStatusHelper';

// Technical Sections for Timeline
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, ReportInfoSection } from '../../employee/inundation/components/TechnicalSections';
import ImageViewer from '../../employee/inundation/components/ImageViewer';

const InundationDetailDialog = ({ open, onClose, point }) => {
    const theme = useTheme();

    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });

    const loadData = useCallback(async () => {
        if (!point?.id || !open) return;
        setLoading(true);
        try {
            const now = dayjs().unix();
            const threeDaysAgo = dayjs().subtract(3, 'day').unix();

            const res = await inundationApi.getPointHistory(point.id, threeDaysAgo, now);
            const dataArr = getDataArray(res);

            const sorted = [...dataArr].sort((a, b) => b.start_time - a.start_time);

            setHistory(sorted);
            if (sorted.length > 0) {
                setSelectedId(sorted[0].id);
            }
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoading(false);
        }
    }, [point?.id, open]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenViewer = (images, index) => {
        setViewer({ open: true, images, index });
    };

    const selectedReport = history.find(h => h.id === selectedId);
    // Prioritize active_report over last_report for summary display
    const displayReport = point?.active_report || point?.last_report || {};

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="lg"
            scroll="paper"
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: { xs: 0, sm: 4 },
                        height: { xs: '100%', md: '85vh' },
                        maxHeight: '900px',
                        m: { xs: 0, sm: 2 }
                    }
                }
            }}
        >
            <DialogTitle sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>
                            {point?.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>
                            Chi tiết điểm ngập
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: 'grey.500' }}>
                        <IconX size={24} />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
                <Stack sx={{ height: '100%' }}>
                    {/* Top Summary Section */}
                    <Box sx={{ p: 2.5, bgcolor: 'primary.lighter', borderBottom: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.1) }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 800, textTransform: 'uppercase', color: 'primary.dark' }}>
                                    Thông số vận hành dự kiến
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.25 }}>
                                    {point?.name}
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <IconClock size={12} />
                                    {displayReport.start_time ? dayjs.unix(displayReport.start_time).format('HH:mm DD/MM/YYYY') : 'Chưa có thông tin báo cáo gần đây'}
                                </Typography>
                            </Box>
                            {point?.status === 'flooded' && (
                                <Chip label="ĐANG NGẬP" color="error" size="small" sx={{ fontWeight: 900, borderRadius: 1.5 }} />
                            )}
                        </Stack>
                        <Grid container spacing={3}>
                            {[
                                { label: 'Chiều dài', value: displayReport.length, unit: '', color: theme.palette.primary.main },
                                { label: 'Chiều rộng', value: displayReport.width, unit: '', color: theme.palette.info.main },
                                { label: 'Độ sâu ngập', value: displayReport.depth, unit: '', color: theme.palette.error.main, bold: true }
                            ].map((stat, i) => (
                                <Grid item xs={4} key={i}>
                                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, textAlign: 'center', borderColor: alpha(stat.color, 0.2), bgcolor: 'white' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block' }}>{stat.label}</Typography>
                                        <Typography variant={stat.bold ? "h2" : "h3"} sx={{ fontWeight: 900, color: stat.color }}>
                                            {stat.value || 0}
                                            <span style={{ fontSize: '0.8rem', marginLeft: 4, opacity: 0.6 }}>{stat.unit}</span>
                                        </Typography>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                    {/* Master-Detail History Section */}
                    <Grid container sx={{ flex: 1, overflow: 'hidden', flexDirection: { xs: 'column', md: 'row' } }}>
                        {/* Sidebar: Report List (Last 3 Days, Flooded) */}
                        <Grid item xs={12} md={4} sx={{
                            borderRight: { xs: 'none', md: '1px solid' },
                            borderBottom: { xs: '1px solid', md: 'none' },
                            borderColor: 'divider',
                            height: { xs: '250px', md: '100%' },
                            overflowY: 'auto',
                            bgcolor: 'grey.50'
                        }}>
                            <Box sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconLayoutList size={20} />
                                    Bản tin có ngập (3 ngày gần nhất)
                                </Typography>

                                {loading && history.length === 0 ? (
                                    <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={24} /></Box>
                                ) : history.length === 0 ? (
                                    <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'white', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                                        <Typography variant="caption" color="textSecondary">Không có bản tin nào trong 3 ngày qua</Typography>
                                    </Box>
                                ) : (
                                    <List disablePadding>
                                        {history.map((h) => {
                                            const isActive = h.id === selectedId;
                                            const hLatest = getLatestData(h);
                                            return (
                                                <ListItemButton
                                                    key={h.id}
                                                    onClick={() => setSelectedId(h.id)}
                                                    selected={isActive}
                                                    sx={{
                                                        mb: 1.5,
                                                        borderRadius: 3,
                                                        flexDirection: 'column',
                                                        alignItems: 'flex-start',
                                                        p: 2,
                                                        bgcolor: isActive ? 'primary.lighter' : 'white',
                                                        border: '1px solid',
                                                        borderColor: isActive ? 'primary.main' : 'grey.200',
                                                        '&.Mui-selected': { bgcolor: 'primary.lighter', '&:hover': { bgcolor: 'primary.lighter' } },
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: isActive ? 'primary.main' : 'text.primary' }}>
                                                            {dayjs.unix(h.start_time).format('DD/MM HH:mm')}
                                                        </Typography>
                                                        {isActive && <IconArrowRight size={18} color={theme.palette.primary.main} />}
                                                    </Box>
                                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                                        <Chip
                                                            size="small" variant="outlined" label={`Sâu ${hLatest.depth || 0}`}
                                                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                                                        />
                                                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                                            {h.end_time ? 'Đã kết thúc' : 'Đang diễn biến'}
                                                        </Typography>
                                                    </Stack>
                                                </ListItemButton>
                                            );
                                        })}
                                    </List>
                                )}
                            </Box>
                        </Grid>

                        {/* Content Area: Selected Report Timeline */}
                        <Grid item xs={12} md={8} sx={{
                            flex: 1,
                            height: { xs: 'auto', md: '100%' },
                            overflowY: 'auto',
                            bgcolor: 'white'
                        }}>
                            {selectedReport ? (
                                <Box sx={{ p: { xs: 2, md: 4 } }}>
                                    <Typography variant="h4" sx={{ mb: 3, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5, color: 'primary.dark' }}>
                                        <IconCalendarEvent size={24} />
                                        Tiến trình bản tin: {dayjs.unix(selectedReport.start_time).format('HH:mm DD/MM/YYYY')}
                                    </Typography>

                                    {/* Timeline construction */}
                                    {[
                                        { ...selectedReport, isStart: true, ts: selectedReport.start_time, title: 'Khởi tạo đợt ngập' },
                                        ...(selectedReport.updates || []).map(u => ({ ...u, isUpdate: true, ts: u.timestamp, title: u.description || 'Cập nhật tình hình' }))
                                    ].sort((a, b) => b.ts - a.ts).map((item, midx) => (
                                        <Box key={midx} sx={{ position: 'relative', pl: 4, mb: 4 }}>
                                            {/* Dot */}
                                            <Box sx={{
                                                position: 'absolute',
                                                left: -7, top: 4,
                                                width: 14, height: 14,
                                                borderRadius: '50%',
                                                bgcolor: 'white',
                                                border: '3px solid',
                                                borderColor: item.isStart ? 'primary.main' : 'success.main',
                                                boxShadow: theme.shadows[1],
                                                zIndex: 2
                                            }} />
                                            {/* Line */}
                                            <Box sx={{
                                                position: 'absolute',
                                                left: -1, top: 14,
                                                bottom: -32,
                                                width: 2,
                                                bgcolor: 'grey.100'
                                            }} />

                                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, bgcolor: item.isStart ? alpha(theme.palette.primary.main, 0.01) : 'white' }}>
                                                <Stack orientation="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                                    <Box>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{item.title}</Typography>
                                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                                            <IconClock size={14} color={theme.palette.text.secondary} />
                                                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
                                                                {dayjs.unix(item.ts).format('HH:mm DD/MM/YYYY')}
                                                            </Typography>
                                                        </Stack>
                                                    </Box>
                                                    {item.depth != null && (
                                                        <Chip
                                                            label={`${item.depth}`}
                                                            size="small" color="error"
                                                            sx={{ fontWeight: 900, borderRadius: 1.5 }}
                                                        />
                                                    )}
                                                </Stack>

                                                <Stack spacing={2}>
                                                    <ReportInfoSection latest={item} handleOpenViewer={handleOpenViewer} />
                                                    <ReviewCommentSection latest={item} />
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={12} sm={6}><SurveyInfoSection latest={item} handleOpenViewer={handleOpenViewer} /></Grid>
                                                        <Grid item xs={12} sm={6}><MechInfoSection latest={item} handleOpenViewer={handleOpenViewer} /></Grid>
                                                    </Grid>
                                                </Stack>

                                                {item.images?.length > 0 && (
                                                    <Box sx={{ display: 'flex', gap: 1, mt: 2, overflowX: 'auto', pb: 1 }}>
                                                        {item.images.map((img, i) => (
                                                            <Box
                                                                key={i}
                                                                component="img"
                                                                src={img}
                                                                onClick={() => handleOpenViewer(item.images, i)}
                                                                sx={{ width: 70, height: 70, borderRadius: 2, objectFit: 'cover', cursor: 'zoom-in', border: '1px solid', borderColor: 'divider' }}
                                                            />
                                                        ))}
                                                    </Box>
                                                )}
                                            </Paper>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography color="textSecondary">Chọn một đợt ngập để xem chi tiết timeline</Typography>
                                </Box>
                            )}
                        </Grid>
                    </Grid>
                </Stack>
            </DialogContent>

            <ImageViewer
                viewer={viewer}
                onClose={() => setViewer({ ...viewer, open: false })}
                onPrev={() => setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }))}
                onNext={() => setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length }))}
            />
        </Dialog>
    );
};

export default InundationDetailDialog;
