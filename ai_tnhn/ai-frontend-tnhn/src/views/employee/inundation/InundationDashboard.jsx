import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import {
    Box, Typography, Card, CardContent, Chip, Stack,
    IconButton, Divider, Collapse, TextField, Button,
    CircularProgress, FormControlLabel, Checkbox, Skeleton,
    Avatar, List, ListItem, ListItemIcon, ListItemText,
    Badge, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Dialog, DialogContent,
    TablePagination, MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
    IconChevronUp, IconChevronDown, IconMapPin,
    IconCamera, IconSend, IconX, IconSearch,
    IconAlertTriangle, IconClock, IconUser,
    IconChevronRight, IconChevronLeft, IconLogout, IconCar
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import inundationApi from 'api/inundation';
import MainCard from 'ui-component/cards/MainCard';

import { getInundationImageUrl } from 'utils/imageHelper';

// ─── Mobile: Point card with inline detail ─────────────────────────────────
const PointCard = ({ point, expandedId, handleCardClick, updateLength, setUpdateLength, updateWidth, setUpdateWidth, updateDepth, setUpdateDepth, updateTrafficStatus, setUpdateTrafficStatus, updateNote, setUpdateNote, updatePreviews, removeUpdateImage, resolveOnUpdate, setResolveOnUpdate, submitting, handleSubmitUpdate, handleUpdateImageChange, navigate, theme, report }) => {
    const isExpanded = expandedId === point.id;
    const isActive = point.status === 'active';

    const formatTime = (ts) => {
        if (!ts) return 'N/A';
        return new Date(ts * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    };

    return (
        <Card sx={{ borderRadius: 2.5, border: '1.5px solid', borderColor: isActive && isExpanded ? 'error.main' : isActive ? 'error.light' : 'divider', boxShadow: isExpanded ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)', transition: 'all .2s', overflow: 'hidden' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, cursor: 'pointer' }} onClick={() => handleCardClick(point)}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '1.2rem', flex: 1 }}>{point.name}</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip label={isActive ? 'Ngập' : 'Ổn định'} color={isActive ? 'error' : 'success'} size="small" sx={{ height: 26, fontSize: '0.9rem', fontWeight: 900 }} />
                        {isActive && (
                            <IconButton size="small" sx={{ p: 0.2 }}>
                                {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                            </IconButton>
                        )}
                    </Stack>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: isActive ? 1 : 0 }}>
                    <IconMapPin size={16} style={{ color: theme.palette.text.disabled }} />
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, fontSize: '1rem' }}>{point.address}</Typography>
                </Box>

                {isActive ? (
                    <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1.5, px: 1.5, py: 1.2, bgcolor: 'error.lighter', borderRadius: 1.5, flexWrap: 'wrap', mb: 1 }}>
                            <Box sx={{ minWidth: 58 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.88rem' }}>Dài</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.dark', fontSize: '1.1rem' }}>{report?.length || '0'}</Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                            <Box sx={{ minWidth: 58 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.88rem' }}>Rộng</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.dark', fontSize: '1.1rem' }}>{report?.width || '0'}</Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                            <Box sx={{ minWidth: 58 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.88rem' }}>Sâu</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.dark', fontSize: '1.1rem' }}>{report?.depth || '0'}</Typography>
                            </Box>
                        </Box>

                        {report?.images?.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 0.5 }}>
                                {report.images.map((img, idx) => (
                                    <Box
                                        key={idx} component="img" src={getInundationImageUrl(img)}
                                        onClick={(e) => { e.stopPropagation(); handleOpenViewer(report.images, idx); }}
                                        sx={{ width: 50, height: 50, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0, border: '1px solid', borderColor: 'divider' }}
                                    />
                                ))}
                            </Box>
                        )}

                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.dark', fontSize: '0.9rem', display: 'block' }}>
                            Bắt đầu lúc: {formatTime(report?.start_time)}
                        </Typography>
                        {(report?.traffic_status || report?.trafficStatus) && (
                            <Chip
                                label={report.traffic_status || report.trafficStatus}
                                size="small" color="warning" variant="filled"
                                icon={<IconCar size={14} color="white" />}
                                sx={{ mt: 1, fontWeight: 800, height: 24, fontSize: '0.75rem' }}
                            />
                        )}
                    </Box>
                ) : (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, fontSize: '1rem' }}>Chạm để báo cáo ngập →</Typography>
                )}
            </CardContent>

            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Divider />
                <Box sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.8rem', display: 'block', mb: 1 }}>Cập nhật tình hình</Typography>

                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                        <TextField size="small" label="Dài" value={updateLength} onChange={(e) => setUpdateLength(e.target.value)} sx={{ bgcolor: 'background.paper', borderRadius: 1.5 }} />
                        <TextField size="small" label="Rộng" value={updateWidth} onChange={(e) => setUpdateWidth(e.target.value)} sx={{ bgcolor: 'background.paper', borderRadius: 1.5 }} />
                        <TextField size="small" label="Sâu" value={updateDepth} onChange={(e) => setUpdateDepth(e.target.value)} sx={{ bgcolor: 'background.paper', borderRadius: 1.5 }} />
                    </Stack>

                    <TextField fullWidth size="small" multiline rows={2} placeholder="Ghi chú: nước đang rút, xe không qua được..." value={updateNote} onChange={(e) => setUpdateNote(e.target.value)} sx={{ mb: 1.5, bgcolor: 'background.paper', borderRadius: 1.5 }} />

                    <TextField
                        select fullWidth size="small" label="Giao thông"
                        value={updateTrafficStatus} onChange={(e) => setUpdateTrafficStatus(e.target.value)}
                        sx={{ mb: 1.5, bgcolor: 'background.paper', borderRadius: 1.5 }}
                    >
                        <MenuItem value="Đi lại bình thường">Đi lại bình thường</MenuItem>
                        <MenuItem value="Đi lại khó khăn">Đi lại khó khăn</MenuItem>
                        <MenuItem value="Không đi được">Không đi được</MenuItem>
                    </TextField>

                    {/* Update Image Previews */}
                    {updatePreviews.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mb: 1.5, pb: 0.5 }}>
                            {updatePreviews.map((p, i) => (
                                <Box key={i} sx={{ position: 'relative', flexShrink: 0 }}>
                                    <img src={p} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                                    <IconButton size="small" onClick={() => removeUpdateImage(i)} sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'error.main', color: 'white', p: 0.3, '&:hover': { bgcolor: 'error.dark' } }}>
                                        <IconX size={10} />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    )}

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <FormControlLabel
                            control={<Checkbox size="small" checked={resolveOnUpdate} onChange={(e) => setResolveOnUpdate(e.target.checked)} color="error" />}
                            label={<Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>Kết thúc đợt ngập này</Typography>}
                            sx={{ mr: 0 }}
                        />
                        <Box sx={{ flex: 1 }} />
                        <IconButton component="label" sx={{ color: 'secondary.main', bgcolor: 'secondary.lighter', p: 1 }}>
                            <input type="file" hidden multiple accept="image/*" onChange={handleUpdateImageChange} />
                            <IconCamera size={20} />
                        </IconButton>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button fullWidth size="small" variant="contained" color={resolveOnUpdate ? "error" : "secondary"} disabled={submitting}
                            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <IconSend size={16} />}
                            onClick={() => handleSubmitUpdate(report)} sx={{ borderRadius: 100, fontWeight: 700, py: 0.8 }}>
                            {resolveOnUpdate ? "Kết thúc & Gửi" : "Cập nhật"}
                        </Button>
                        <Button size="small" variant="text" color="inherit"
                            onClick={() => navigate(`/admin/inundation/form?tab=1&id=${report.id}&name=${encodeURIComponent(point.name)}`)}
                            sx={{ minWidth: 0, px: 0.5, color: 'text.secondary', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            Chi tiết →
                        </Button>
                    </Stack>
                </Box>
            </Collapse>
        </Card>
    );
};

const InundationDashboard = () => {
    const navigate = useNavigate();
    const { search } = useLocation();
    const { userInfo } = useOutletContext();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const userRole = localStorage.getItem('role') || 'employee';
    const basePath = userRole === 'employee' ? '/company' : '/admin';

    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [updateNote, setUpdateNote] = useState('');
    const [updateLength, setUpdateLength] = useState('');
    const [updateWidth, setUpdateWidth] = useState('');
    const [updateDepth, setUpdateDepth] = useState('');
    const [updateTrafficStatus, setUpdateTrafficStatus] = useState('Đi lại bình thường');
    const [updateImages, setUpdateImages] = useState([]);
    const [updatePreviews, setUpdatePreviews] = useState([]);
    const [resolveOnUpdate, setResolveOnUpdate] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [historyStatus, setHistoryStatus] = useState('');
    const [historyTrafficStatus, setHistoryTrafficStatus] = useState('');

    // Pagination for History
    const [historyPage, setHistoryPage] = useState(0);
    const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
    const [totalHistory, setTotalHistory] = useState(0);

    // Lightbox viewer
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });

    const handleOpenViewer = (imgs, idx = 0) => {
        if (!imgs || imgs.length === 0) return;
        setViewer({ open: true, images: imgs, index: idx });
    };
    const handleCloseViewer = () => setViewer({ ...viewer, open: false });
    const handlePrev = (e) => { e?.stopPropagation(); setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length })); };
    const handleNext = (e) => { e?.stopPropagation(); setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length })); };

    // Read activeTab from URL query
    const params = new URLSearchParams(search);
    const activeTab = parseInt(params.get('activeTab') || '0');

    const [orgReports, setOrgReports] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchPoints = async () => {
        try {
            const response = await inundationApi.getPointsStatus();
            setPoints(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch points:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrgReports = async () => {
        setLoadingHistory(true);
        try {
            const res = await inundationApi.listReports(historyPage, historyRowsPerPage, {
                status: historyStatus,
                traffic_status: historyTrafficStatus,
                query: searchQuery
            });
            if (res.data?.status === 'success') {
                const result = res.data.data;
                setOrgReports(result.data || []);
                setTotalHistory(result.total || 0);
            }
        } catch (error) {
            toast.error('Lỗi khi tải lịch sử báo cáo');
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => { fetchPoints(); }, []);

    useEffect(() => {
        if (activeTab === 2 || !isMobile) {
            fetchOrgReports();
        }
    }, [activeTab, historyPage, historyRowsPerPage, isMobile, historyStatus, historyTrafficStatus, searchQuery]);

    const stats = useMemo(() => {
        const total = points.length;
        const active = points.filter(p => p.status === 'active').length;
        return { total, active, normal: total - active };
    }, [points]);

    const filteredPoints = useMemo(() => {
        let result = activeTab === 1 ? points.filter(p => p.status === 'active') : points;

        if (historyStatus) {
            result = result.filter(p => p.status === historyStatus);
        }

        if (historyTrafficStatus) {
            result = result.filter(p => {
                const ts = p.active_report?.traffic_status || p.active_report?.trafficStatus;
                return ts === historyTrafficStatus;
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name?.toLowerCase().includes(q) ||
                p.address?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [points, activeTab, searchQuery, historyStatus, historyTrafficStatus]);

    const formatTime = (ts) => {
        if (!ts) return 'N/A';
        return new Date(ts * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    };

    const getDuration = (startTime) => {
        if (!startTime) return '';
        const diff = Math.floor(Date.now() / 1000) - startTime;
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        return h > 0 ? `${h}h ${m}p` : `${m}p`;
    };

    const handleCardClick = (point) => {
        if (!isMobile) {
            if (point.status === 'active') {
                navigate(`${basePath}/inundation/form?tab=1&id=${point.active_report?.id}&name=${encodeURIComponent(point.name)}`);
            } else {
                navigate(`${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`);
            }
            return;
        }

        if (point.status !== 'active') {
            navigate(`${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`);
            return;
        }

        if (expandedId === point.id) {
            setExpandedId(null);
        } else {
            setExpandedId(point.id);
            setUpdateLength(point.active_report?.length || '');
            setUpdateWidth(point.active_report?.width || '');
            setUpdateDepth(point.active_report?.depth || '');
            setUpdateTrafficStatus(point.active_report?.traffic_status || point.active_report?.trafficStatus || 'Đi lại bình thường');
        }
    };

    const handleSubmitUpdate = async (report) => {
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('description', updateNote);
            if (updateLength) fd.append('length', updateLength);
            if (updateWidth) fd.append('width', updateWidth);
            if (updateDepth) fd.append('depth', updateDepth);
            if (updateTrafficStatus) fd.append('traffic_status', updateTrafficStatus);
            if (resolveOnUpdate) fd.append('resolve', 'true');
            updateImages.forEach(img => fd.append('images', img));

            const res = await inundationApi.updateSituation(report.id, fd);
            if (res.data?.status === 'success') {
                toast.success(resolveOnUpdate ? 'Đã kết thúc đợt ngập' : 'Cập nhật thành công');
                setUpdateNote(''); setUpdateImages([]); setUpdatePreviews([]); setExpandedId(null); fetchPoints();
            }
        } catch { toast.error('Cập nhật thất bại'); }
        finally { setSubmitting(false); }
    };

    const handleUpdateImageChange = (e) => {
        const files = Array.from(e.target.files);
        setUpdateImages([...updateImages, ...files]);
        setUpdatePreviews([...updatePreviews, ...files.map(f => URL.createObjectURL(f))]);
    };

    const removeUpdateImage = (i) => {
        const ni = [...updateImages]; ni.splice(i, 1); setUpdateImages(ni);
        const np = [...updatePreviews]; URL.revokeObjectURL(np[i]); np.splice(i, 1); setUpdatePreviews(np);
    };

    const handleResolve = async (report) => {
        if (!window.confirm('Xác nhận kết thúc đợt ngập?')) return;
        setSubmitting(true);
        try {
            await inundationApi.resolveReport(report.id, { end_time: Math.floor(Date.now() / 1000) });
            toast.success('Đã kết thúc đợt ngập');
            setExpandedId(null); fetchPoints();
        } catch { toast.error('Lỗi khi kết thúc'); }
        finally { setSubmitting(false); }
    };

    const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('role'); navigate('/pages/login'); };

    // ─── Render Logic ─────────────────────────────────────────────────────────

    const renderHistoryTable = () => (
        <Box>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
                <TextField
                    size="small" placeholder="Tìm tên đường..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ width: 250 }}
                    InputProps={{ startAdornment: <IconSearch size={16} sx={{ mr: 1, color: 'text.disabled' }} /> }}
                />
                <TextField
                    select size="small" label="Trạng thái" value={historyStatus} onChange={(e) => { setHistoryStatus(e.target.value); setHistoryPage(0); }} sx={{ minWidth: 150 }}
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="active">Đang ngập</MenuItem>
                    <MenuItem value="resolved">Đã kết thúc</MenuItem>
                </TextField>
                <TextField
                    select size="small" label="Giao thông" value={historyTrafficStatus} onChange={(e) => { setHistoryTrafficStatus(e.target.value); setHistoryPage(0); }} sx={{ minWidth: 180 }}
                >
                    <MenuItem value="">Tất cả giao thông</MenuItem>
                    <MenuItem value="Đi lại bình thường">Đi lại bình thường</MenuItem>
                    <MenuItem value="Đi lại khó khăn">Đi lại khó khăn</MenuItem>
                    <MenuItem value="Không đi được">Không đi được</MenuItem>
                </TextField>
            </Stack>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Tuyến đường</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Kích thước</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Giao thông</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Ảnh</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loadingHistory ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}><CircularProgress size={24} /></TableCell></TableRow>
                        ) : orgReports.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}>Không có dữ liệu lịch sử</TableCell></TableRow>
                        ) : (
                            orgReports.map((report) => (
                                <TableRow key={report.id} hover>
                                    <TableCell><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{report.street_name}</Typography></TableCell>
                                    <TableCell><Typography variant="body2">{formatTime(report.start_time)}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{report.length || '0'}x{report.width || '0'}x{report.depth || '0'}</Typography></TableCell>
                                    <TableCell>
                                        {(report.traffic_status || report.trafficStatus) && (
                                            <Chip label={report.traffic_status || report.trafficStatus} size="small" variant="outlined" color="warning" sx={{ fontWeight: 700, fontSize: '0.75rem' }} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'} color={report.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} />
                                    </TableCell>
                                    <TableCell>
                                        {report.images?.length > 0 && (
                                            <Stack direction="row" spacing={0.5}>
                                                {report.images.slice(0, 3).map((img, idx) => (
                                                    <Box
                                                        key={idx} component="img" src={getInundationImageUrl(img)}
                                                        onClick={() => handleOpenViewer(report.images, idx)}
                                                        sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'divider' }}
                                                    />
                                                ))}
                                                {report.images.length > 3 && (
                                                    <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleOpenViewer(report.images, 3)}>
                                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>+{report.images.length - 3}</Typography>
                                                    </Box>
                                                )}
                                            </Stack>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button size="small" variant="text" onClick={() => navigate(`${basePath}/inundation/form?id=${report.id}&tab=1`)}>Chi tiết</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]} component="div" count={totalHistory}
                    rowsPerPage={historyRowsPerPage} page={historyPage}
                    onPageChange={(e, p) => setHistoryPage(p)}
                    onRowsPerPageChange={(e) => { setHistoryRowsPerPage(parseInt(e.target.value, 10)); setHistoryPage(0); }}
                    labelRowsPerPage="Dòng mỗi trang:"
                />
            </TableContainer>
        </Box>
    );

    const renderImageViewer = () => (
        <Dialog open={viewer.open} onClose={handleCloseViewer} maxWidth="lg" PaperProps={{ sx: { bgcolor: 'black', borderRadius: 4, overflow: 'hidden', position: 'relative' } }}>
            <IconButton onClick={handleCloseViewer} sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
                <IconX size={20} />
            </IconButton>
            <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', position: 'relative' }}>
                {viewer.images.length > 1 && (
                    <>
                        <IconButton onClick={handlePrev} sx={{ position: 'absolute', left: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}>
                            <IconChevronLeft size={32} />
                        </IconButton>
                        <IconButton onClick={handleNext} sx={{ position: 'absolute', right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}>
                            <IconChevronRight size={32} />
                        </IconButton>
                    </>
                )}
                <Box component="img" src={getInundationImageUrl(viewer.images[viewer.index])} sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }} />
                <Box sx={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
                    <Typography sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.5)', display: 'inline-block', px: 2, py: 0.5, borderRadius: 10, fontSize: '0.85rem' }}>
                        {viewer.index + 1} / {viewer.images.length}
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );

    // desktop view
    if (!isMobile) {
        return (
            <MainCard
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant="h3">Trực ngập lụt Hà Nội</Typography>
                        <Stack direction="row" spacing={1}>
                            <Chip label="Điểm trực" variant={activeTab === 0 ? 'filled' : 'outlined'} color="primary" onClick={() => navigate(`${basePath}/inundation`)} sx={{ fontWeight: 700 }} />
                            <Chip label="Lịch sử báo cáo" variant={activeTab === 2 ? 'filled' : 'outlined'} color="primary" onClick={() => navigate(`${basePath}/inundation?activeTab=2`)} sx={{ fontWeight: 700 }} />
                        </Stack>
                    </Box>
                }
            >
                {activeTab === 2 ? renderHistoryTable() : (
                    <>
                        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                size="small" placeholder="Tìm kiếm điểm ngập..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ width: 320 }}
                                InputProps={{ startAdornment: <IconSearch size={16} sx={{ mr: 1, color: 'text.disabled' }} /> }}
                            />
                            <TextField
                                select size="small" label="Trạng thái" value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value)} sx={{ minWidth: 150 }}
                            >
                                <MenuItem value="">Tất cả</MenuItem>
                                <MenuItem value="active">Đang ngập</MenuItem>
                                <MenuItem value="normal">Bình thường</MenuItem>
                            </TextField>
                            <TextField
                                select size="small" label="Giao thông" value={historyTrafficStatus} onChange={(e) => setHistoryTrafficStatus(e.target.value)} sx={{ minWidth: 200 }}
                            >
                                <MenuItem value="">Tất cả giao thông</MenuItem>
                                <MenuItem value="Đi lại bình thường">Đi lại bình thường</MenuItem>
                                <MenuItem value="Đi lại khó khăn">Đi lại khó khăn</MenuItem>
                                <MenuItem value="Không đi được">Không đi được</MenuItem>
                            </TextField>
                            <Box sx={{ flexGrow: 1 }} />
                            {!loading && (
                                <Stack direction="row" spacing={1}>
                                    <Chip label={`Đang ngập: ${stats.active}`} size="small" color="error" sx={{ fontWeight: 600 }} />
                                    <Chip label={`Bình thường: ${stats.normal}`} size="small" color="success" sx={{ fontWeight: 600 }} />
                                </Stack>
                            )}
                        </Box>
                        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <Table sx={{ minWidth: 650 }}>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Điểm trực ngập</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Địa chỉ</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Giao thông</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Kích thước (D x R x S)</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Thời gian ngập</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? [1, 2, 3].map(i => (
                                        <TableRow key={i}><TableCell colSpan={7}><Skeleton height={40} /></TableCell></TableRow>
                                    )) : filteredPoints.map(point => (
                                        <TableRow key={point.id} hover>
                                            <TableCell><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{point.name}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" color="textSecondary">{point.address}</Typography></TableCell>
                                            <TableCell><Chip label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'} color={point.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 600 }} /></TableCell>
                                            <TableCell>
                                                {(point.active_report?.traffic_status || point.active_report?.trafficStatus) && (
                                                    <Chip label={point.active_report.traffic_status || point.active_report.trafficStatus} size="small" variant="outlined" color="warning" sx={{ fontWeight: 700 }} />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {point.status === 'active' ? (
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{point.active_report?.length || '0'} x {point.active_report?.width || '0'} x {point.active_report?.depth || '0'}</Typography>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {point.status === 'active' ? (
                                                    <Box>
                                                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>Từ: {formatTime(point.active_report?.start_time)}</Typography>
                                                        <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>Lâu: {getDuration(point.active_report?.start_time)}</Typography>
                                                    </Box>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    variant={point.status === 'active' ? 'contained' : 'outlined'} color={point.status === 'active' ? 'error' : 'primary'} size="small"
                                                    onClick={() => navigate(point.status === 'active'
                                                        ? `${basePath}/inundation/form?tab=1&id=${point.active_report.id}&name=${encodeURIComponent(point.name)}`
                                                        : `${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`
                                                    )}
                                                    sx={{ fontWeight: 700 }}
                                                >
                                                    {point.status === 'active' ? 'Cập nhật' : 'Báo cáo'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
                {renderImageViewer()}
            </MainCard>
        );
    }

    // Mobile views
    if (activeTab === 2) {
        return (
            <Box sx={{ px: 2, pt: 2, pb: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h3" sx={{ fontWeight: 900 }}>Lịch sử báo cáo</Typography>
                </Box>
                <Stack spacing={1.5} sx={{ mb: 3 }}>
                    <TextField
                        fullWidth size="small" placeholder="Tìm tên đường..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{ startAdornment: <IconSearch size={18} sx={{ color: 'text.disabled', mr: 1 }} /> }}
                        sx={{ bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                    <Stack direction="row" spacing={1}>
                        <TextField
                            select fullWidth size="small" label="Trạng thái" value={historyStatus} onChange={(e) => { setHistoryStatus(e.target.value); setHistoryPage(0); }}
                            sx={{ bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            <MenuItem value="active">Đang ngập</MenuItem>
                            <MenuItem value="resolved">Kết thúc</MenuItem>
                        </TextField>
                        <TextField
                            select fullWidth size="small" label="Giao thông" value={historyTrafficStatus} onChange={(e) => { setHistoryTrafficStatus(e.target.value); setHistoryPage(0); }}
                            sx={{ bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            <MenuItem value="Đi lại bình thường">Bình thường</MenuItem>
                            <MenuItem value="Đi lại khó khăn">Khó khăn</MenuItem>
                            <MenuItem value="Không đi được">Tắc nghẽn</MenuItem>
                        </TextField>
                    </Stack>
                </Stack>
                {loadingHistory && historyPage === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : orgReports.length === 0 ? (
                    <Typography color="textSecondary" align="center" sx={{ py: 4, fontStyle: 'italic' }}>Chưa có báo cáo nào.</Typography>
                ) : (
                    <Box>
                        {orgReports.map((report) => (
                            <Card
                                key={report.id}
                                sx={{ mb: 2, borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}
                                onClick={() => navigate(`${basePath}/inundation/form?id=` + report.id + '&tab=1')}
                            >
                                <Box sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', flex: 1 }}>{report.street_name}</Typography>
                                        <Chip label={report.status === 'active' ? 'Đang trực' : 'Kết thúc'} size="small" color={report.status === 'active' ? 'error' : 'success'} sx={{ height: 22, fontWeight: 800, fontSize: '0.7rem' }} />
                                    </Box>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <IconClock size={16} /> {formatTime(report.start_time)}
                                    </Typography>

                                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
                                        <Chip label={`${report.length || 0}x${report.width || 0}x${report.depth || 0}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                                        {report.traffic_status && (
                                            <Chip label={report.traffic_status} size="small" color="warning" sx={{ fontWeight: 800 }} />
                                        )}
                                    </Stack>

                                    {report.images?.length > 0 && (
                                        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1 }}>
                                            {report.images.map((img, idx) => (
                                                <Box
                                                    key={idx} component="img" src={getInundationImageUrl(img)}
                                                    onClick={(e) => { e.stopPropagation(); handleOpenViewer(report.images, idx); }}
                                                    sx={{ width: 64, height: 64, borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
                                                />
                                            ))}
                                        </Box>
                                    )}

                                    <Typography variant="caption" sx={{ bgcolor: 'grey.100', px: 1, py: 0.5, borderRadius: 1, fontWeight: 700, color: 'text.secondary' }}>
                                        Cán bộ: {report.user_email?.split('@')[0] || 'Unknown'}
                                    </Typography>
                                </Box>
                            </Card>
                        ))}

                        {totalHistory > orgReports.length && (
                            <Button fullWidth onClick={() => setHistoryPage(p => p + 1)} disabled={loadingHistory} sx={{ mt: 1, fontWeight: 700 }}>
                                {loadingHistory ? <CircularProgress size={20} /> : 'Xem thêm báo cáo cũ hơn'}
                            </Button>
                        )}
                    </Box>
                )}
                {renderImageViewer()}
            </Box>
        );
    }

    if (activeTab === 3) {
        return (
            <Box sx={{ px: 2, pt: 4, textAlign: 'center' }}>
                <Avatar sx={{ width: 96, height: 96, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}><IconUser size={48} /></Avatar>
                <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5 }}>{userInfo?.name || 'Cán bộ kỹ thuật'}</Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>{userInfo?.email || 'Phòng Thoát Nước Hà Nội'}</Typography>
                <List sx={{ bgcolor: 'background.paper', borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 4, overflow: 'hidden' }}>
                    <ListItem button sx={{ py: 2 }}><ListItemIcon><IconUser size={26} color={theme.palette.primary.main} /></ListItemIcon><ListItemText primary="Thông tin cá nhân" primaryTypographyProps={{ fontWeight: 700 }} /><IconChevronRight size={20} /></ListItem>
                    <Divider />
                    <ListItem button onClick={handleLogout} sx={{ color: 'error.main', py: 2 }}><ListItemIcon><IconLogout size={26} color={theme.palette.error.main} /></ListItemIcon><ListItemText primary="Đăng xuất" primaryTypographyProps={{ fontWeight: 700 }} /><IconChevronRight size={20} /></ListItem>
                </List>
            </Box>
        );
    }

    return (
        <Box sx={{ px: 2, pt: 2, pb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h2" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: -0.5 }}>Trực ngập lụt</Typography>
                <Badge badgeContent={stats.active} color="error" max={99} overlap="circular">
                    <Avatar sx={{ bgcolor: 'error.lighter', width: 40, height: 40 }}><IconAlertTriangle size={20} color={theme.palette.error.main} /></Avatar>
                </Badge>
            </Box>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip label={`Tất cả (${stats.total})`} variant={activeTab === 0 ? 'filled' : 'outlined'} color="primary" onClick={() => navigate(`${basePath}/inundation`)} sx={{ fontWeight: 800, height: 36, fontSize: '0.95rem' }} />
                <Chip label={`Đang ngập (${stats.active})`} color="error" variant={activeTab === 1 ? 'filled' : 'outlined'} onClick={() => navigate(`${basePath}/inundation?activeTab=1`)} sx={{ fontWeight: 800, height: 36, fontSize: '0.95rem' }} />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                    select fullWidth size="small" label="Trạng thái" value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value)}
                    sx={{ bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="active">Đang ngập</MenuItem>
                    <MenuItem value="normal">Bình thường</MenuItem>
                </TextField>
                <TextField
                    select fullWidth size="small" label="Giao thông" value={historyTrafficStatus} onChange={(e) => setHistoryTrafficStatus(e.target.value)}
                    sx={{ bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="Đi lại bình thường">Bình thường</MenuItem>
                    <MenuItem value="Đi lại khó khăn">Khó khăn</MenuItem>
                    <MenuItem value="Không đi được">Tắc nghẽn</MenuItem>
                </TextField>
            </Stack>
            <TextField
                fullWidth size="small" placeholder="Tìm tên đường, địa chỉ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2.5, bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                InputProps={{ startAdornment: <IconSearch size={18} sx={{ color: 'text.disabled', mr: 1 }} /> }}
            />
            <Stack spacing={2}>
                {loading ? [1, 2, 3].map(i => <Skeleton key={i} height={120} sx={{ borderRadius: 3 }} />) :
                    filteredPoints.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8, opacity: 0.5 }}><Typography sx={{ fontStyle: 'italic' }}>Không tìm thấy dữ liệu.</Typography></Box>
                    ) : filteredPoints.map(point => (
                        <PointCard key={point.id} point={point} expandedId={expandedId} handleCardClick={handleCardClick} updateLength={updateLength} setUpdateLength={setUpdateLength} updateWidth={updateWidth} setUpdateWidth={setUpdateWidth} updateDepth={updateDepth} setUpdateDepth={setUpdateDepth} updateTrafficStatus={updateTrafficStatus} setUpdateTrafficStatus={setUpdateTrafficStatus} updateNote={updateNote} setUpdateNote={setUpdateNote} updatePreviews={updatePreviews} removeUpdateImage={removeUpdateImage} resolveOnUpdate={resolveOnUpdate} setResolveOnUpdate={setResolveOnUpdate} submitting={submitting} handleSubmitUpdate={handleSubmitUpdate} handleUpdateImageChange={handleUpdateImageChange} navigate={navigate} theme={theme} report={point.active_report} />
                    ))
                }
            </Stack>
            {renderImageViewer()}
        </Box>
    );
};

export default InundationDashboard;
