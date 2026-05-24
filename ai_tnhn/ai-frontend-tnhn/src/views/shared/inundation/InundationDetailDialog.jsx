import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Typography,
    IconButton, Grid, Stack, Chip, useMediaQuery, Tabs, Tab
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconX, IconClock, IconRuler } from '@tabler/icons-react';
import dayjs from 'dayjs';

import inundationApi from 'api/inundation';
import { getDataArray } from 'utils/apiHelper';
import InundationDetail from '../../employee/inundation/InundationDetail';
import InundationHistoryView from './InundationHistoryView';
import useAuthStore from 'store/useAuthStore';

const InundationDetailDialog = ({ open, onClose, point }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuthStore();

    const [loading, setLoading] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [tabValue, setTabValue] = useState(0);

    const loadData = useCallback(async () => {
        if (!point || !open) return;
        setLoading(true);
        try {
            let reportId = point.report_id;

            if (!reportId) {
                if (point.last_report?.id) {
                    reportId = point.last_report.id;
                } else {
                    const resHistory = await inundationApi.listReports(0, 10, {
                        point_id: point.id,
                        from_time: dayjs().subtract(3, 'day').unix(),
                        to_time: dayjs().unix()
                    });
                    const history = getDataArray(resHistory);
                    if (history.length > 0) {
                        const sorted = [...history].sort((a, b) => (b.created_at || b.start_time) - (a.created_at || a.start_time));
                        reportId = sorted[0].id;
                    }
                }
            }

            if (reportId) {
                const res = await inundationApi.getReport(reportId);
                setSelectedReport(res);
            } else {
                setSelectedReport(null);
            }
        } catch (err) {
            console.error('Failed to load report detail:', err);
        } finally {
            setLoading(false);
        }
    }, [point, open]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (open) {
            setTabValue(0);
        }
    }, [open, point]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            fullScreen={isMobile}
            scroll="paper"
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: isMobile ? 0 : 4,
                        minHeight: isMobile ? '100%' : { md: '80vh' },
                        maxHeight: isMobile ? '100%' : '900px',
                        m: isMobile ? 0 : 2
                    }
                }
            }}
        >
            <DialogTitle sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', pb: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main' }}>
                            {point?.name}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: 'grey.500' }}>
                        <IconX size={24} />
                    </IconButton>
                </Box>
                <Tabs
                    value={tabValue}
                    onChange={(e, val) => setTabValue(val)}
                    variant="fullWidth"
                    sx={{
                        minHeight: 44,
                        '& .MuiTab-root': {
                            minHeight: 44,
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            textTransform: 'none',
                            color: 'text.secondary'
                        }
                    }}
                >
                    <Tab label="Chi tiết" />
                    <Tab label="Lịch sử Timeline" />
                </Tabs>
            </DialogTitle>

            <DialogContent sx={{ p: 0, bgcolor: 'grey.50' }}>
                {tabValue === 0 ? (
                    <>
                        {selectedReport && !loading && (
                            <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.2, bgcolor: 'white', borderBottom: '1px dashed', borderColor: 'divider' }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                                    <Stack direction="row" spacing={{ xs: 2, sm: 3 }} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                                        <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap', fontSize: { xs: '0.85rem', sm: '0.75rem' } }}>
                                            <IconClock size={16} />
                                            {dayjs.unix(selectedReport.created_at || selectedReport.start_time).format('DD/MM/YYYY HH:mm')}
                                        </Typography>
                                        <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 800, color: 'primary.main', whiteSpace: 'nowrap', fontSize: { xs: '0.85rem', sm: '0.75rem' } }}>
                                            <IconRuler size={16} />
                                            {selectedReport.length} x {selectedReport.width} x <span style={{ color: theme.palette.error.main, fontSize: '1.1rem', marginLeft: 4 }}>{selectedReport.depth}</span>
                                        </Typography>
                                    </Stack>
                                    <Chip
                                        label={selectedReport.status === 'resolved' ? 'Đã kết thúc' : 'Đang diễn biến'}
                                        color={selectedReport.status === 'resolved' ? 'success' : 'error'}
                                        size="small"
                                        variant="light"
                                        sx={{ fontWeight: 900, borderRadius: 1 }}
                                    />
                                </Stack>
                            </Box>
                        )}

                        <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                            <InundationDetail
                                selectedReport={selectedReport}
                                loadingReport={loading}
                                user={user}
                                hideHeader={true}
                            />
                        </Box>
                    </>
                ) : (
                    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                        <InundationHistoryView
                            pointId={point?.id}
                            hideHeader={true}
                        />
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default InundationDetailDialog;
