import React from 'react';
import {
    Box, Typography, Stack, Chip, Paper, CircularProgress,
    Dialog, Button, TextField, Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconClock, IconRuler, IconRefresh
} from '@tabler/icons-react';

import { getTrafficStatusColor } from 'utils/trafficStatusHelper';
import InundationReportPanel from './InundationReportPanel';

// Shared Components
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection, KtclInfoSection, ReportInfoSection } from './components/TechnicalSections';
import ImageViewer from './components/ImageViewer';

// Hook
import useInundationDetail from './hooks/useInundationDetail';

const InundationDetail = ({ selectedReport, loadingReport, user, hideHeader = false }) => {
    const theme = useTheme();

    const {
        viewer,
        setViewer,
        handleOpenViewer,
        reviewDialog,
        setReviewDialog,
        handleReviewSubmit,
        canReview,
        editMode,
        setEditMode,
        timelineData,
        isEmployee,
        hasPermission
    } = useInundationDetail({ selectedReport });

    if (loadingReport) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>;
    if (!selectedReport) return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
            <IconRefresh size={48} color={theme.palette.grey[300]} stroke={1.5} />
            <Typography color="textSecondary" sx={{ mt: 2 }}>Vui lòng chọn một đợt ngập để xem chi tiết</Typography>
        </Box>
    );

    const trafficColor = getTrafficStatusColor(selectedReport.traffic_status);

    return (
        <Box>
            {!hideHeader && (
                <Paper sx={{ mb: 3, p: 2, bgcolor: 'secondary.lighter', borderRadius: 3, border: '1px solid', borderColor: 'secondary.light' }}>
                    <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h3" color="secondary.dark" sx={{ fontWeight: 900 }}>{selectedReport.street_name}</Typography>
                            <Chip
                                label={selectedReport.status === 'active' ? 'Đang diễn biến' : 'Đã kết thúc'}
                                color={selectedReport.status === 'active' ? 'error' : 'success'}
                                size="small" sx={{ fontWeight: 800 }}
                            />
                        </Box>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconClock size={16} /> {new Date((selectedReport.created_at || selectedReport.start_time) * 1000).toLocaleString('vi-VN')}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconRuler size={16} /> {selectedReport.length || 0} x {selectedReport.width || 0} x {selectedReport.depth || 0}
                            </Typography>
                            {selectedReport.traffic_status && (
                                <Chip label={selectedReport.traffic_status} size="small" color={trafficColor} sx={{ fontWeight: 700 }} />
                            )}
                        </Stack>
                    </Stack>
                </Paper>
            )}

            {selectedReport.review_comment && (
                <Box sx={{ mb: 2.5, px: 1 }}>
                    <ReviewCommentSection latest={selectedReport} />
                </Box>
            )}

            <Box sx={{ px: 1 }}>
                <Grid container spacing={2.5}>
                    {/* Row 1: Báo cáo Địa bàn & Báo cáo KT-CL */}
                    <Grid item xs={12} md={6}>
                        <ReportInfoSection latest={selectedReport} handleOpenViewer={handleOpenViewer} showPlaceholder={true} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <KtclInfoSection latest={selectedReport} handleOpenViewer={handleOpenViewer} showPlaceholder={true} />
                    </Grid>

                    {/* Row 2: TK Giám sát & XN Cơ giới */}
                    <Grid item xs={12} md={6}>
                        <SurveyInfoSection latest={selectedReport} handleOpenViewer={handleOpenViewer} showPlaceholder={true} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MechInfoSection latest={selectedReport} handleOpenViewer={handleOpenViewer} showPlaceholder={true} />
                    </Grid>
                </Grid>

                <Stack direction="row" spacing={1.5} sx={{ mt: 3, px: 0.5 }}>
                    {canReview && !selectedReport.needs_correction && (
                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => setReviewDialog({ open: true, itemId: selectedReport.id, type: 'start', comment: selectedReport.review_comment || '' })}
                            sx={{ borderRadius: 2, fontWeight: 700 }}
                        >
                            Gửi nhận xét yêu cầu sửa đổi
                        </Button>
                    )}
                    {(isEmployee || hasPermission('inundation:edit')) && selectedReport.needs_correction && (
                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => setEditMode({ open: true, item: selectedReport })}
                            sx={{ borderRadius: 2, fontWeight: 700 }}
                        >
                            Chỉnh sửa lại thông tin điểm ngập
                        </Button>
                    )}
                </Stack>
            </Box>

            <ImageViewer viewer={viewer} onClose={() => setViewer({ ...viewer, open: false })} onPrev={() => setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }))} onNext={() => setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length }))} />

            {/* Review Dialog */}
            <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ ...reviewDialog, open: false })} fullWidth maxWidth="xs">
                <Box sx={{ p: 2 }}>
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 800 }}>Gửi nhận xét rà soát</Typography>
                    <TextField fullWidth multiline rows={4} placeholder="Nhập nội dung yêu cầu chỉnh sửa..." value={reviewDialog.comment} onChange={(e) => setReviewDialog({ ...reviewDialog, comment: e.target.value })} />
                    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                        <Button onClick={() => setReviewDialog({ ...reviewDialog, open: false })}>Hủy</Button>
                        <Button variant="contained" color="error" onClick={handleReviewSubmit}>Gửi yêu cầu</Button>
                    </Stack>
                </Box>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editMode.open} onClose={() => setEditMode({ open: false, item: null })} fullWidth maxWidth="sm">
                <Box sx={{ p: 2 }}>
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 800 }}>Chỉnh sửa báo cáo</Typography>
                    <InundationReportPanel selectedReport={editMode.item} pointId={selectedReport.point_id} initialStreetName={selectedReport.street_name} isCorrectionMode={true} onSuccess={() => setEditMode({ open: false, item: null })} />
                </Box>
            </Dialog>
        </Box>
    );
};

export default InundationDetail;
