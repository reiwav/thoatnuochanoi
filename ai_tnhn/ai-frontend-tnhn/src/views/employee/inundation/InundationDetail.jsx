import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Stack, Chip, Paper, CircularProgress,
    Dialog, DialogContent, IconButton as MuiIconButton, useMediaQuery,
    Button, TextField, Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconClock, IconRuler, IconPlus, IconX, IconRefresh, IconCar,
    IconMessage2, IconEdit, IconCheck, IconAlertTriangle
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

import inundationApi from 'api/inundation';
import InundationReportPanel from './InundationReportPanel';
import useAuthStore from 'store/useAuthStore';
import { getTrafficStatusColor } from 'utils/trafficStatusHelper';
import { getInundationImageUrl } from 'utils/imageHelper';

// Shared Components
import { SurveyInfoSection, MechInfoSection, ReviewCommentSection } from './components/TechnicalSections';
import ImageViewer from './components/ImageViewer';

const InundationDetail = ({ selectedReport, loadingReport, user, hideHeader = false }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
    const [reviewDialog, setReviewDialog] = useState({ open: false, itemId: null, type: null, comment: '' });
    const [editMode, setEditMode] = useState({ open: false, item: null });

    const { role: userRole, hasPermission, isEmployee, isCompany } = useAuthStore();

    const canReview = useMemo(() => {
        if (isEmployee) return false;
        if (!hasPermission('inundation:review')) return false;
        if (isCompany || userRole === 'super_admin') return true;
        if (!selectedReport) return false;
        return selectedReport.org_id === user?.org_id;
    }, [user, isCompany, isEmployee, selectedReport, hasPermission, userRole]);

    const handleOpenViewer = (imgs, idx = 0) => setViewer({ open: true, images: imgs, index: idx });

    const timelineData = useMemo(() => {
        if (!selectedReport) return [];
        const updates = selectedReport.updates || [];

        if (updates.length === 0) {
            return [{
                ...selectedReport,
                id: selectedReport.id,
                type: 'start', title: 'Bắt đầu đợt ngập', ts: selectedReport.start_time,
                images: selectedReport.images || []
            }];
        }

        return updates.map((u, i) => ({
            ...u,
            id: u.id,
            type: u.description === 'Bắt đầu đợt ngập' ? 'start' : 'update',
            title: (u.status === 'resolved') ? 'Kết thúc đợt ngập' : (u.description || `Cập nhật #${i + 1}`),
            ts: u.timestamp,
            images: u.images || []
        })).reverse();
    }, [selectedReport]);

    useEffect(() => {
        if (!selectedReport) return;
        const searchParams = new URLSearchParams(window.location.search);
        const editId = searchParams.get('edit_update_id');
        if (editId && timelineData.length > 0 && !editMode.open) {
            const updToEdit = timelineData.find((t) => t.id === editId);
            if (updToEdit) {
                setEditMode({ open: true, item: updToEdit });
                searchParams.delete('edit_update_id');
                const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [selectedReport, timelineData]);

    const handleReviewSubmit = async () => {
        if (!reviewDialog.comment.trim()) return;
        try {
            if (reviewDialog.type === 'start') {
                await inundationApi.reviewReport(reviewDialog.itemId, reviewDialog.comment);
            } else {
                await inundationApi.reviewUpdate(reviewDialog.itemId, reviewDialog.comment);
            }
            toast.success('Đã gửi phản hồi');
            setReviewDialog({ open: false, itemId: null, type: null, comment: '' });
        } catch (err) {
            toast.error('Lỗi khi gửi phản hồi');
        }
    };

    if (loadingReport) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>;
    if (!selectedReport) return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
            <IconRefresh size={48} color={theme.palette.grey[300]} stroke={1.5} />
            <Typography color="textSecondary" sx={{ mt: 2 }}>Vui lòng chọn một đợt ngập để xem chi tiết</Typography>
        </Box>
    );

    const latest = timelineData[0] || {};
    const trafficColor = getTrafficStatusColor(latest.traffic_status || latest.trafficStatus || selectedReport.traffic_status);

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
                                <IconClock size={16} /> {new Date(selectedReport.start_time * 1000).toLocaleString('vi-VN')}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconRuler size={16} /> {latest.length || 0} x {latest.width || 0} x {latest.depth || 0}
                            </Typography>
                            {trafficColor && (
                                <Chip label={latest.traffic_status || latest.trafficStatus} size="small" color={trafficColor} sx={{ fontWeight: 700 }} />
                            )}
                        </Stack>
                    </Stack>
                </Paper>
            )}

            {!hideHeader && <Typography variant="h4" sx={{ mb: 2, fontWeight: 800, px: 1 }}>Lịch sử cập nhật</Typography>}

            <Box sx={{ px: 1 }}>
                {timelineData.map((item, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 2, position: 'relative', p: 1.5, mb: 1, borderRadius: 3, bgcolor: item.needs_correction ? 'error.lighter' : 'transparent', border: item.needs_correction ? '1px dashed' : 'none', borderColor: 'error.light' }}>
                        {idx < timelineData.length - 1 && <Box sx={{ position: 'absolute', left: 21, top: 40, width: 2, height: 'calc(100% - 20px)', bgcolor: 'grey.200' }} />}
                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', mt: 1, zIndex: 1, bgcolor: item.type === 'start' ? 'primary.main' : 'success.main', border: '3px solid white', boxShadow: '0 0 0 1px #ddd' }} />

                        <Box sx={{ flex: 1, pb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>{item.title}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>
                                    {new Date(item.ts * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(item.ts * 1000).toLocaleDateString('vi-VN')}
                                </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ mb: 1.5 }}>{item.desc || item.description}</Typography>

                            <ReviewCommentSection latest={item} />
                            <SurveyInfoSection latest={{ ...item, survey_images: item.survey_images || [] }} handleOpenViewer={handleOpenViewer} />
                            <MechInfoSection latest={{ ...item, mech_images: item.mech_images || [] }} handleOpenViewer={handleOpenViewer} />

                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                {canReview && !item.needs_correction && (
                                    <Button size="small" variant="outlined" color="error" onClick={() => setReviewDialog({ open: true, itemId: item.id, type: item.type, comment: item.review_comment || '' })}>
                                        Nhận xét
                                    </Button>
                                )}
                                {(isEmployee || hasPermission('inundation:edit')) && item.needs_correction && (
                                    <Button size="small" variant="contained" color="error" onClick={() => setEditMode({ open: true, item })}>Chỉnh sửa lại</Button>
                                )}
                            </Stack>

                            {item.images?.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 1 }}>
                                    {item.images.map((img, i) => (
                                        <Box 
                                            key={i} component="img" src={getInundationImageUrl(img)} 
                                            onClick={() => handleOpenViewer(item.images, i)} 
                                            sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', cursor: 'zoom-in', border: '1px solid', borderColor: 'divider' }} 
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                ))}
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
