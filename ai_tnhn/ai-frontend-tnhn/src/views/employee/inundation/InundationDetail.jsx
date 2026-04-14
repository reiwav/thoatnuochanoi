import { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Stack, Chip, Divider, Paper, CircularProgress,
    Dialog, DialogContent, IconButton as MuiIconButton, useMediaQuery,
    Button, TextField, Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconClock, IconRuler, IconPlus, IconX, IconRefresh, IconUser,
    IconChevronLeft, IconChevronRight, IconCar, IconMessage2, IconEdit,
    IconAlertTriangle
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import inundationApi from 'api/inundation';
import InundationReportPanel from './InundationReportPanel';
import useAuthStore from 'store/useAuthStore';

import { getInundationImageUrl } from 'utils/imageHelper';
import { getTrafficStatusColor } from 'utils/trafficStatusHelper';

const InundationDetail = ({ selectedReport, loadingReport, user }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
    const [reviewDialog, setReviewDialog] = useState({ open: false, itemId: null, type: null, comment: '' });
    const [editMode, setEditMode] = useState({ open: false, item: null });

    const { role: userRole, hasPermission, isEmployee } = useAuthStore();

    const handleOpenViewer = (imgs, idx = 0) => {
        if (!imgs || imgs.length === 0) {
            toast.error('Không có ảnh đính kèm');
            return;
        }
        setViewer({ open: true, images: imgs, index: idx });
    };

    const handleCloseViewer = () => setViewer({ ...viewer, open: false });
    const handlePrev = (e) => { e.stopPropagation(); setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length })); };
    const handleNext = (e) => { e.stopPropagation(); setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length })); };

    const timelineData = useMemo(() => {
        if (!selectedReport) return [];
        const updates = selectedReport.updates || [];
        return [
            {
                id: selectedReport.id,
                type: 'start', title: 'Bắt đầu đợt ngập', ts: selectedReport.start_time, desc: selectedReport.description || 'Ghi nhận bắt đầu',
                length: selectedReport.length, width: selectedReport.width, depth: selectedReport.depth,
                traffic_status: selectedReport.traffic_status || selectedReport.trafficStatus,
                user: selectedReport.user_email,
                images: selectedReport.images || [],
                review_comment: selectedReport.review_comment,
                reviewer_id: selectedReport.reviewer_id,
                reviewer_email: selectedReport.reviewer_email,
                reviewer_name: selectedReport.reviewer_name,
                needs_correction: selectedReport.needs_correction,
                survey_checked: selectedReport.survey_checked,
                survey_note: selectedReport.survey_note,
                survey_images: selectedReport.survey_images,
                survey_user_id: selectedReport.survey_user_id,
                mech_checked: selectedReport.mech_checked,
                mech_note: selectedReport.mech_note,
                mech_d: selectedReport.mech_d,
                mech_r: selectedReport.mech_r,
                mech_s: selectedReport.mech_s,
                mech_user_id: selectedReport.mech_user_id,
                mech_images: selectedReport.mech_images
            },
            ...updates.map((u, i) => ({
                id: u.id,
                type: 'update',
                title: (u.status === 'resolved') ? 'Kết thúc đợt ngập' : (u.description || `Cập nhật #${i + 1}`),
                ts: u.timestamp,
                desc: u.description || 'Cập nhật hiện trường',
                length: u.length,
                width: u.width,
                depth: u.depth,
                traffic_status: u.traffic_status || u.trafficStatus,
                user: u.user_email || u.user_id,
                userName: u.user_name,
                images: u.images || [],
                review_comment: u.review_comment,
                reviewer_id: u.reviewer_id,
                reviewer_email: u.reviewer_email,
                reviewer_name: u.reviewer_name,
                needs_correction: u.needs_correction,
                survey_checked: u.survey_checked,
                survey_note: u.survey_note,
                survey_images: u.survey_images,
                survey_user_id: u.survey_user_id,
                mech_checked: u.mech_checked,
                mech_note: u.mech_note,
                mech_d: u.mech_d,
                mech_r: u.mech_r,
                mech_s: u.mech_s,
                mech_user_id: u.mech_user_id,
                mech_images: u.mech_images
            }))
        ].reverse();
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

    if (loadingReport) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>;
    if (!selectedReport) return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
            <IconRefresh size={48} color={theme.palette.grey[300]} stroke={1.5} />
            <Typography color="textSecondary" sx={{ mt: 2, fontSize: '0.9rem' }}>Vui lòng chọn một đợt ngập từ màn hình Dashboard để xem chi tiết</Typography>
        </Box>
    );

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
            window.location.reload(); 
        } catch (err) {
            toast.error('Lỗi khi gửi phản hồi');
        }
    };

    const latest = timelineData[0] || {};
    const latestLength = latest.length || selectedReport.length || '0';
    const latestWidth = latest.width || selectedReport.width || '0';
    const latestDepth = latest.depth || selectedReport.depth || '0';
    const latestTraffic = latest.traffic_status || latest.trafficStatus || selectedReport.traffic_status || selectedReport.trafficStatus;

    return (
        <Box>
            <Paper sx={{ mb: 3, p: isMobile ? 1 : 2, bgcolor: 'secondary.lighter', borderRadius: 3, boxShadow: 'none', border: '1px solid', borderColor: 'secondary.light' }}>
                <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 1.5 }}>
                        <Typography variant={isMobile ? "h4" : "h3"} color="secondary.dark" sx={{ fontWeight: 900, flex: 1, lineHeight: 1.2 }}>{selectedReport.street_name}</Typography>
                        <Chip
                            label={selectedReport.status === 'active' ? 'Đang diễn biến' : 'Đã kết thúc'}
                            color={selectedReport.status === 'active' ? 'error' : 'success'}
                            size="small" sx={{ fontWeight: 800, height: 28, fontSize: '0.85rem' }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconClock size={15} /> {new Date(selectedReport.start_time * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                <IconRuler size={14} color={theme.palette.text.secondary} />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{latestLength} x {latestWidth} x {latestDepth}</Typography>
                            </Box>
                            {latestTraffic && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: `${getTrafficStatusColor(latestTraffic)}.light`, px: 1, py: 0.2, borderRadius: 10 }}>
                                    <IconCar size={14} color={theme.palette[getTrafficStatusColor(latestTraffic)].dark} />
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: `${getTrafficStatusColor(latestTraffic)}.darker` }}>{latestTraffic}</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Stack>
            </Paper>



            <Typography variant="h4" sx={{ mb: 2, px: 0.5, fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                Lịch sử cập nhật <Chip label={timelineData.length} size="small" sx={{ height: 24, fontSize: '0.82rem', fontWeight: 900 }} />
            </Typography>

            <Box sx={{ px: 1 }}>
                {timelineData.map((item, idx, arr) => (
                    <Box
                        key={idx}
                        sx={{
                            display: 'flex', gap: isMobile ? 1.5 : 2, position: 'relative',
                            p: 1.5, borderRadius: 3,
                            bgcolor: item.needs_correction ? 'error.lighter' : 'transparent',
                            border: item.needs_correction ? '1px dashed' : 'none',
                            borderColor: 'error.light',
                            mb: 1
                        }}
                    >
                        {idx < arr.length - 1 && (
                            <Box sx={{ position: 'absolute', left: 19, top: 32, width: 2, height: 'calc(100% - 20px)', bgcolor: 'grey.200' }} />
                        )}

                        <Box sx={{
                            width: 24, height: 24, borderRadius: '50%', flexShrink: 0, zIndex: 1, mt: 1,
                            bgcolor: item.type === 'start' ? 'secondary.main' : (item.title === 'Kết thúc đợt ngập' ? 'success.main' : 'grey.300'),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '4px solid white', boxShadow: '0 0 0 1px #eee'
                        }}>
                            {item.type === 'start' ? <IconPlus size={10} /> : (item.title === 'Kết thúc đợt ngập' ? <IconX size={10} /> : <IconRefresh size={10} />)}
                        </Box>

                        <Box sx={{ pb: 3, flex: 1, minWidth: 0 }}>
                            <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} sx={{ mb: 0.5, gap: isMobile ? 0.3 : 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 800, flex: 1, fontSize: isMobile ? '0.9rem' : 'inherit', lineHeight: 1.3, wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {item.title}
                                    {item.needs_correction && <Chip label="Cần sửa" size="small" color="error" variant="filled" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900 }} />}
                                </Typography>
                                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600, whiteSpace: 'nowrap', opacity: 0.8, fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                                    {new Date(item.ts * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} • {new Date(item.ts * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                            </Stack>
                            <Typography variant="body1" color="textSecondary" sx={{ mb: 1, fontWeight: 500 }}>{item.desc}</Typography>

                            {item.review_comment && (
                                <Box sx={{ 
                                    mb: 2, p: 2, 
                                    bgcolor: 'error.lighter', 
                                    borderRadius: 2, 
                                    borderLeft: '4px solid', 
                                    borderColor: 'error.main',
                                    boxShadow: '0 2px 4px rgba(211, 47, 47, 0.05)'
                                }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'error.main', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <IconAlertTriangle size={18} /> Nhận xét rà soát:
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.dark', lineHeight: 1.5 }}>
                                        {item.review_comment}
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'error.main', fontWeight: 600, fontStyle: 'italic', opacity: 0.9 }}>
                                        — Người rà soát: {item.reviewer_name || item.reviewer_email || item.reviewer_id}
                                    </Typography>
                                </Box>
                            )}

                            {(item.survey_checked || item.survey_note) && (
                                <Box sx={{ mb: 1.5, p: 1, borderLeft: '3px solid', borderColor: 'primary.main', bgcolor: 'primary.lighter', borderRadius: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', display: 'block', mb: 0.5 }}>⚡️ KHẢO SÁT THIẾT KẾ:</Typography>
                                    {item.survey_note && <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.survey_note}</Typography>}
                                    {item.survey_images?.length > 0 && (
                                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                            {item.survey_images.map((img, i) => (
                                                <Box key={i} component="img" src={getInundationImageUrl(img)} onClick={() => handleOpenViewer(item.survey_images, i)} sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', cursor: 'pointer' }} />
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {(item.mech_checked || item.mech_note) && (
                                <Box sx={{ mb: 1.5, p: 1, borderLeft: '3px solid', borderColor: 'secondary.main', bgcolor: 'secondary.lighter', borderRadius: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.main', display: 'block', mb: 0.5 }}>⚙️ CƠ GIỚI/HỖ TRỢ:</Typography>
                                    {(item.mech_d || item.mech_r || item.mech_s) && (
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.dark', mb: 0.5, display: 'block' }}>
                                            D: {item.mech_d || '-'} | R: {item.mech_r || '-'} | S: {item.mech_s || '-'}
                                        </Typography>
                                    )}
                                    {item.mech_note && <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.mech_note}</Typography>}
                                    {item.mech_images?.length > 0 && (
                                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                            {item.mech_images.map((img, i) => (
                                                <Box key={i} component="img" src={getInundationImageUrl(img)} onClick={() => handleOpenViewer(item.mech_images, i)} sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', cursor: 'pointer' }} />
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            )}

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                                {(item.depth || item.length || item.width) && (
                                    <Box sx={{ px: 1.2, py: 0.5, bgcolor: 'grey.50', borderRadius: 100, border: '1px solid', borderColor: 'grey.200', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <IconRuler size={14} color={theme.palette.text.secondary} />
                                        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, fontSize: '0.9rem' }}>
                                            {item.length || '0'} x {item.width || '0'} x {item.depth || '0'}
                                        </Typography>
                                    </Box>
                                )}
                                {(item.traffic_status || item.trafficStatus) && (
                                    <Box sx={{ px: 1.2, py: 0.5, bgcolor: `${getTrafficStatusColor(item.traffic_status || item.trafficStatus)}.lighter`, borderRadius: 100, border: '1px solid', borderColor: `${getTrafficStatusColor(item.traffic_status || item.trafficStatus)}.light`, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <IconCar size={14} color={theme.palette[getTrafficStatusColor(item.traffic_status || item.trafficStatus)].main} />
                                        <Typography variant="caption" sx={{ color: `${getTrafficStatusColor(item.traffic_status || item.trafficStatus)}.dark`, fontWeight: 700, fontSize: '0.9rem' }}>
                                            {item.traffic_status || item.trafficStatus}
                                        </Typography>
                                    </Box>
                                )}
                                {item.user && (
                                    <Box sx={{ px: 1.2, py: 0.5, bgcolor: 'secondary.lighter', borderRadius: 100, border: '1px solid', borderColor: 'secondary.light', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <IconUser size={14} color={theme.palette.secondary.main} />
                                        <Typography variant="caption" sx={{ color: 'secondary.dark', fontWeight: 700, fontSize: '0.85rem' }}>
                                            {item.userName || item.user.split('@')[0]}
                                        </Typography>
                                    </Box>
                                )}

                                {hasPermission('inundation:review') && (
                                    <Button
                                        size="small" startIcon={<IconMessage2 size={16} />}
                                        variant="outlined" color="error"
                                        onClick={() => setReviewDialog({ open: true, itemId: item.id, type: item.type, comment: item.review_comment || '' })}
                                        sx={{ height: 26, borderRadius: 10, fontSize: '0.75rem', fontWeight: 700 }}
                                    >
                                        Nhận xét
                                    </Button>
                                )}

                                {(hasPermission('inundation:edit') || (isEmployee && item.needs_correction)) && (
                                    <Button
                                        size="small" startIcon={<IconEdit size={16} />}
                                        variant="contained" color="error"
                                        onClick={() => setEditMode({ open: true, item: item })}
                                        sx={{ height: 26, borderRadius: 10, fontSize: '0.75rem', fontWeight: 700 }}
                                    >
                                        Chỉnh sửa lại
                                    </Button>
                                )}
                            </Box>

                             {item.images?.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1.2, mt: 1.5, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 4 } }}>
                                    {item.images.map((img, i) => (
                                        <Box
                                            key={i} component="img" src={getInundationImageUrl(img)}
                                            onClick={(e) => { e.stopPropagation(); handleOpenViewer(item.images, i); }}
                                            sx={{ width: 90, height: 90, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'zoom-in', transition: 'transform .2s', flexShrink: 0, '&:hover': { transform: 'scale(1.02)' } }}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* Image Slider / Lightbox */}
            <Dialog open={viewer.open} onClose={handleCloseViewer} maxWidth="lg" PaperProps={{ sx: { bgcolor: 'black', borderRadius: 4, overflow: 'hidden', position: 'relative' } }}>
                <MuiIconButton onClick={handleCloseViewer} sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
                    <IconX size={20} />
                </MuiIconButton>

                <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', position: 'relative' }}>
                    {viewer.images.length > 1 && (
                        <>
                            <MuiIconButton onClick={handlePrev} sx={{ position: 'absolute', left: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}>
                                <IconChevronLeft size={32} />
                            </MuiIconButton>
                            <MuiIconButton onClick={handleNext} sx={{ position: 'absolute', right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}>
                                <IconChevronRight size={32} />
                            </MuiIconButton>
                        </>
                    )}

                    <Box
                        component="img"
                        src={getInundationImageUrl(viewer.images[viewer.index])}
                        sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', animation: 'fadeIn .3s' }}
                    />

                    <Box sx={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
                        <Typography sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.5)', display: 'inline-block', px: 2, py: 0.5, borderRadius: 10, fontSize: '0.85rem' }}>
                            {viewer.index + 1} / {viewer.images.length}
                        </Typography>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Review Dialog */}
            <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ ...reviewDialog, open: false })} fullWidth maxWidth="xs">
                <Box sx={{ p: 2.5 }}>
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 800 }}>Gửi nhận xét rà soát</Typography>
                    <TextField
                        fullWidth multiline rows={4} autoFocus
                        placeholder="Nhập nội dung cần nhân viên chỉnh sửa lại..."
                        value={reviewDialog.comment}
                        onChange={(e) => setReviewDialog({ ...reviewDialog, comment: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button onClick={() => setReviewDialog({ ...reviewDialog, open: false })} color="inherit">Hủy</Button>
                        <Button
                            variant="contained" color="error" startIcon={<IconMessage2 size={18} />}
                            disabled={!reviewDialog.comment.trim()}
                            onClick={handleReviewSubmit}
                        >
                            Gửi yêu cầu sửa
                        </Button>
                    </Stack>
                </Box>
            </Dialog>

            {/* Correction Edit Dialog */}
            <Dialog open={editMode.open} onClose={() => setEditMode({ open: false, item: null })} fullWidth maxWidth="sm">
                <Box sx={{ p: 2, position: 'relative' }}>
                    <MuiIconButton onClick={() => setEditMode({ open: false, item: null })} sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                        <IconX size={20} />
                    </MuiIconButton>
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 800, color: 'error.main', pr: 4 }}>
                        Chỉnh sửa báo cáo theo yêu cầu
                    </Typography>
                    <InundationReportPanel
                        selectedReport={editMode.item}
                        pointId={selectedReport.point_id}
                        initialStreetName={selectedReport.street_name}
                        isCorrectionMode={true}
                        onSuccess={() => {
                            setEditMode({ open: false, item: null });
                            toast.success('Chỉnh sửa đã được lưu');
                            window.location.reload();
                        }}
                    />
                </Box>

            </Dialog>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </Box>
    );
};

export default InundationDetail;
