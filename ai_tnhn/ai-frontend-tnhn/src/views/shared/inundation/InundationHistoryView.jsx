import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Box, Typography, Stack, Chip, Paper, CircularProgress, 
    Divider, alpha, Grid, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
    IconClock, IconRuler, IconCar, IconCalendarEvent, 
    IconLayoutList
} from '@tabler/icons-react';

import inundationApi from 'api/inundation';
import { getTrafficStatusColor } from 'utils/trafficStatusHelper';
import { formatDateTime } from 'utils/dataHelper';
import { getLatestData } from 'utils/inundationUtils';

// Shared Components from employee view
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection } from '../../employee/inundation/components/TechnicalSections';
import ImageViewer from '../../employee/inundation/components/ImageViewer';

const InundationHistoryView = ({ pointId: propPointId, hideHeader = false }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [searchParams] = useSearchParams();
    const pointId = propPointId || searchParams.get('id');

    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });

    const loadHistory = useCallback(async () => {
        if (!pointId) {
            setHistory([]);
            return;
        }
        setLoading(true);
        try {
            // Specialized point history API returning list of reports
            const reports = await inundationApi.getPointHistory(pointId);
            const dataArr = Array.isArray(reports) ? reports : (reports?.items || []);
            
            const filtered = dataArr
                .filter(r => r.point_id === pointId)
                .sort((a, b) => b.start_time - a.start_time);
            setHistory(filtered);
        } catch (err) {
            console.error('Failed to load history:', err);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [pointId]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

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
                p: isMobile ? 1.5 : 4, 
                borderRadius: hideHeader ? 4 : '0 0 16px 16px', 
                border: hideHeader ? 'none' : '1px solid', 
                borderColor: 'grey.200', 
                borderTop: 'none' 
            }}>
                {history.map((report, idx) => {
                    const latest = getLatestData(report);
                    const trafficColor = getTrafficStatusColor(latest.traffic_status);
                    const updates = report.updates || [];
                    
                    const eventTimeline = [
                        { ...report, isStart: true, ts: report.start_time, title: 'Báo cáo khởi tạo' },
                        ...updates.map(u => ({ ...u, isUpdate: true, ts: u.timestamp, title: u.description || 'Cập nhật diễn biến' }))
                    ].sort((a, b) => b.ts - a.ts);

                    return (
                        <Box key={report.id} sx={{ mb: 5 }}>
                            <Box sx={{ mb: 2.5, px: isMobile ? 0.5 : 0 }}>
                                <Typography variant="h4" sx={{ mb: 1.5, fontWeight: 900, color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconCalendarEvent size={20} />
                                    {formatDateTime(report.start_time)}
                                </Typography>
                                
                                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                                    <Chip 
                                        size="small"
                                        icon={<IconRuler size={14} />} 
                                        label={`${latest.length || '?'} x ${latest.width || '?'} x ${latest.depth || 0}`}
                                        sx={{ fontWeight: 800, bgcolor: 'grey.100' }}
                                    />
                                    {latest.traffic_status && (
                                        <Chip 
                                            size="small"
                                            icon={<IconCar size={14} />} 
                                            label={latest.traffic_status} 
                                            color={trafficColor}
                                            sx={{ fontWeight: 800 }}
                                        />
                                    )}
                                </Stack>
                            </Box>

                            <Box sx={{ pl: isMobile ? 1.5 : 3, borderLeft: '2px dashed', borderColor: 'grey.200', ml: isMobile ? 1 : 1.5 }}>
                                {eventTimeline.map((item, midx) => (
                                    <Box key={midx} sx={{ position: 'relative', pl: isMobile ? 2.5 : 4, mb: 3 }}>
                                        <Box sx={{ 
                                            position: 'absolute', 
                                            left: isMobile ? -14 : -17.5, top: 4, 
                                            width: 14, height: 14, 
                                            borderRadius: '50%', 
                                            bgcolor: 'white',
                                            border: '3px solid',
                                            borderColor: item.isStart ? 'primary.main' : 'success.main',
                                            boxShadow: theme.shadows[1],
                                            zIndex: 2
                                        }} />

                                        <Paper variant="outlined" sx={{ p: isMobile ? 1.5 : 2.5, borderRadius: 3, bgcolor: item.needs_correction ? alpha(theme.palette.error.main, 0.02) : 'white' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>{item.title}</Typography>
                                                    <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <IconClock size={12} /> {formatDateTime(item.ts)}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {(item.desc || item.description) && (
                                                <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary', lineHeight: 1.5 }}>
                                                    {item.desc || item.description}
                                                </Typography>
                                            )}

                                            <Stack spacing={2}>
                                                <ReviewCommentSection latest={item} />
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={6}>
                                                        <SurveyInfoSection latest={item} handleOpenViewer={handleOpenViewer} />
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <MechInfoSection latest={item} handleOpenViewer={handleOpenViewer} />
                                                    </Grid>
                                                </Grid>
                                            </Stack>

                                            {item.images?.length > 0 && (
                                                <Box sx={{ display: 'flex', gap: 1, mt: 2, overflowX: 'auto', pb: 1 }}>
                                                    {item.images.map((img, i) => (
                                                        <Box 
                                                            key={i} 
                                                            component="img" 
                                                            src={img} 
                                                            onClick={handleOpenViewer ? () => handleOpenViewer(item.images, i) : undefined}
                                                            sx={{ width: 70, height: 70, borderRadius: 1.5, objectFit: 'cover', cursor: 'zoom-in' }} 
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                        </Paper>
                                    </Box>
                                ))}
                            </Box>
                            {idx < history.length - 1 && <Divider sx={{ my: 4, borderStyle: 'dotted' }} />}
                        </Box>
                    );
                })}
            </Box>

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
