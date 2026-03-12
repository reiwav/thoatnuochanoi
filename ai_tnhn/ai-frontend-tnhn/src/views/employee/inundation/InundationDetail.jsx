import { useState } from 'react';
import {
    Box, Typography, Stack, Chip, Divider, Paper, CircularProgress,
    Dialog, DialogContent, IconButton as MuiIconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconClock, IconRuler, IconPlus, IconX, IconRefresh, IconUser,
    IconChevronLeft, IconChevronRight, IconCar
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

import { getInundationImageUrl } from 'utils/imageHelper';
import { getTrafficStatusColor } from 'utils/trafficStatusHelper';

const InundationDetail = ({ selectedReport, loadingReport }) => {
    const theme = useTheme();

    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });

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

    if (loadingReport) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>;
    if (!selectedReport) return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
            <IconRefresh size={48} color={theme.palette.grey[300]} stroke={1.5} />
            <Typography color="textSecondary" sx={{ mt: 2, fontSize: '0.9rem' }}>Vui lòng chọn một đợt ngập từ màn hình Dashboard để xem chi tiết</Typography>
        </Box>
    );

    const updates = selectedReport.updates || [];
    const timelineData = [
        {
            type: 'start', title: 'Bắt đầu đợt ngập', ts: selectedReport.start_time, desc: selectedReport.description || 'Ghi nhận bắt đầu',
            length: selectedReport.length, width: selectedReport.width, depth: selectedReport.depth,
            traffic_status: selectedReport.traffic_status || selectedReport.trafficStatus,
            user: selectedReport.user_email,
            images: selectedReport.images || []
        },
        ...updates.map((u, i) => ({
            type: 'update',
            title: (u.status === 'resolved') ? 'Kết thúc đợt ngập' : `Cập nhật #${i + 1}`,
            ts: u.timestamp,
            desc: u.description || 'Cập nhật hiện trường',
            length: u.length,
            width: u.width,
            depth: u.depth,
            traffic_status: u.traffic_status || u.trafficStatus,
            user: u.user_email,
            images: u.images || []
        }))
    ].reverse();

    const latest = timelineData[0] || {};
    const latestLength = latest.length || selectedReport.length || '0';
    const latestWidth = latest.width || selectedReport.width || '0';
    const latestDepth = latest.depth || selectedReport.depth || '0';
    const latestTraffic = latest.traffic_status || latest.trafficStatus || selectedReport.traffic_status || selectedReport.trafficStatus;

    return (
        <Box>
            <Paper sx={{ mb: 3, p: 2, bgcolor: 'secondary.lighter', borderRadius: 3, boxShadow: 'none', border: '1px solid', borderColor: 'secondary.light' }}>
                <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h4" color="secondary.dark" sx={{ fontWeight: 900 }}>{selectedReport.street_name}</Typography>
                        <Chip
                            label={selectedReport.status === 'active' ? 'Đang diễn biến' : 'Đã kết thúc'}
                            color={selectedReport.status === 'active' ? 'error' : 'success'}
                            size="small" sx={{ fontWeight: 800, height: 24, fontSize: '0.82rem' }}
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
                            display: 'flex', gap: 2, position: 'relative',
                            p: 1, mx: -1, borderRadius: 2
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

                        <Box sx={{ pb: 3, flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>{item.title}</Typography>
                                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>
                                    {new Date(item.ts * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                            </Box>
                            <Typography variant="body1" color="textSecondary" sx={{ mb: 1.5 }}>{item.desc}</Typography>

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
                                        <Typography variant="caption" sx={{ color: 'secondary.dark', fontWeight: 700, fontSize: '0.9rem' }}>
                                            {item.user.split('@')[0]}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {item.images?.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
                                    {item.images.map((img, i) => (
                                        <Box
                                            key={i} component="img" src={getInundationImageUrl(img)}
                                            onClick={(e) => { e.stopPropagation(); handleOpenViewer(item.images, i); }}
                                            sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'zoom-in', transition: 'transform .2s', '&:hover': { transform: 'scale(1.05)' } }}
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

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </Box>
    );
};

export default InundationDetail;
