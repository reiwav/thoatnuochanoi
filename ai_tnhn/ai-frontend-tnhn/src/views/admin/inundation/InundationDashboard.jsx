import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Card, CardContent, Typography, Chip, Button, Box,
    Skeleton, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, useMediaQuery,
    Avatar, Divider, List, ListItem, ListItemText, ListItemIcon,
    IconButton, Badge, Collapse, TextField, CircularProgress,
    FormControlLabel, Checkbox
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { toast } from 'react-hot-toast';

import MainCard from 'ui-component/cards/MainCard';
import inundationApi from 'api/inundation';

import {
    IconRuler, IconClock, IconFileText, IconPlus, IconRefresh,
    IconMapPin, IconPhone, IconChevronLeft, IconChevronRight,
    IconCamera, IconCloudUpload, IconX, IconAlertTriangle, IconSearch,
    IconUser, IconLogout, IconSend, IconChevronUp, IconChevronDown, IconHistory
} from '@tabler/icons-react';

const InundationDashboard = () => {
    const navigate = useNavigate();
    const { search } = useLocation();
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
    const [updateImages, setUpdateImages] = useState([]);
    const [updatePreviews, setUpdatePreviews] = useState([]);
    const [resolveOnUpdate, setResolveOnUpdate] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

    useEffect(() => { fetchPoints(); }, []);

    const stats = useMemo(() => {
        const total = points.length;
        const active = points.filter(p => p.status === 'active').length;
        return { total, active, normal: total - active };
    }, [points]);

    const filteredPoints = useMemo(() => {
        let result = activeTab === 1 ? points.filter(p => p.status === 'active') : points;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name?.toLowerCase().includes(q) ||
                p.address?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [points, activeTab, searchQuery]);

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
        if (point.status === 'active') {
            navigate(`${basePath}/inundation/form?tab=1&id=${point.active_report?.id}&name=${encodeURIComponent(point.name)}`);
        } else {
            navigate(`${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`);
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

    // ─── Desktop ───────────────────────────────────────────────────────────────
    if (!isMobile) {
        return (
            <MainCard
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant="h3">Quản lý trực ngập lụt</Typography>
                        {!loading && (
                            <Stack direction="row" spacing={1}>
                                <Chip label={`Tổng: ${stats.total}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                                <Chip label={`Đang ngập: ${stats.active}`} size="small" color="error" sx={{ fontWeight: 600 }} />
                                <Chip label={`Bình thường: ${stats.normal}`} size="small" color="success" sx={{ fontWeight: 600 }} />
                            </Stack>
                        )}
                    </Box>
                }
            >
                {/* Desktop search box */}
                <Box sx={{ mb: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Tìm kiếm theo tên đường, địa chỉ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ width: 320 }}
                        InputProps={{
                            startAdornment: <IconSearch size={16} sx={{ color: 'text.disabled', mr: 1, fontSize: '1.1rem' }} />,
                            endAdornment: searchQuery ? (
                                <IconButton size="small" onClick={() => setSearchQuery('')}>
                                    <IconX size={16} />
                                </IconButton>
                            ) : null
                        }}
                    />
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Điểm trực ngập</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Địa chỉ</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Kích thước (D x R x S)</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Thời gian ngập</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? [1, 2, 3].map(i => (
                                <TableRow key={i}><TableCell colSpan={5}><Skeleton height={50} /></TableCell></TableRow>
                            )) : filteredPoints.map(point => (
                                <TableRow key={point.id} hover>
                                    <TableCell><Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{point.name}</Typography></TableCell>
                                    <TableCell><Typography variant="body2" color="textSecondary">{point.address}</Typography></TableCell>
                                    <TableCell>
                                        <Chip label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'} color={point.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 600 }} />
                                    </TableCell>
                                    <TableCell>
                                        {point.status === 'active' ? (
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {point.active_report?.length || '0'} x {point.active_report?.width || '0'} x {point.active_report?.depth || '0'}
                                            </Typography>
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
                                            variant={point.status === 'active' ? 'contained' : 'outlined'}
                                            color={point.status === 'active' ? 'error' : 'primary'}
                                            size="small"
                                            onClick={() => navigate(point.status === 'active'
                                                ? `${basePath}/inundation/form?tab=1&id=${point.active_report.id}&name=${encodeURIComponent(point.name)}`
                                                : `${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`
                                            )}
                                            sx={{ fontWeight: 600 }}
                                        >
                                            {point.status === 'active' ? 'Cập nhật' : 'Báo cáo'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </MainCard>
        );
    }

    // ─── Mobile: Point card with inline detail ─────────────────────────────────
    const PointCard = ({ point }) => {
        const isExpanded = expandedId === point.id;
        const isActive = point.status === 'active';
        const report = point.active_report;

        return (
            <Card sx={{ borderRadius: 2.5, border: '1.5px solid', borderColor: isActive && isExpanded ? 'error.main' : isActive ? 'error.light' : 'divider', boxShadow: isExpanded ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)', transition: 'all .2s', overflow: 'hidden' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, cursor: 'pointer' }} onClick={() => handleCardClick(point)}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.9rem', flex: 1 }}>{point.name}</Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <Chip label={isActive ? 'Ngập' : 'Ổn định'} color={isActive ? 'error' : 'success'} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900 }} />
                            {isActive && (
                                <IconButton size="small" sx={{ p: 0.2 }}>
                                    {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                                </IconButton>
                            )}
                        </Stack>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: isActive ? 1 : 0 }}>
                        <IconMapPin size={12} style={{ color: theme.palette.text.disabled }} />
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>{point.address}</Typography>
                    </Box>

                    {isActive ? (
                        <Box sx={{ display: 'flex', gap: 1, px: 1, py: 0.8, bgcolor: 'error.lighter', borderRadius: 1.5, flexWrap: 'wrap' }}>
                            <Box sx={{ minWidth: 45 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.55rem' }}>Dài</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.dark', fontSize: '0.75rem' }}>{report?.length || '0'}</Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                            <Box sx={{ minWidth: 45 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.55rem' }}>Rộng</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.dark', fontSize: '0.75rem' }}>{report?.width || '0'}</Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                            <Box sx={{ minWidth: 45 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.55rem' }}>Sâu</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.dark', fontSize: '0.75rem' }}>{report?.depth || '0'}</Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.55rem' }}>Từ lúc</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.dark', fontSize: '0.75rem' }}>{formatTime(report?.start_time)}</Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>Chạm để báo cáo ngập →</Typography>
                    )}
                </CardContent>

                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Divider />
                    <Box sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem', display: 'block', mb: 1 }}>Cập nhật tình hình</Typography>

                        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                            <TextField size="small" label="Dài" value={updateLength} onChange={(e) => setUpdateLength(e.target.value)} sx={{ bgcolor: 'background.paper', borderRadius: 1.5 }} />
                            <TextField size="small" label="Rộng" value={updateWidth} onChange={(e) => setUpdateWidth(e.target.value)} sx={{ bgcolor: 'background.paper', borderRadius: 1.5 }} />
                            <TextField size="small" label="Sâu" value={updateDepth} onChange={(e) => setUpdateDepth(e.target.value)} sx={{ bgcolor: 'background.paper', borderRadius: 1.5 }} />
                        </Stack>

                        <TextField fullWidth size="small" multiline rows={2} placeholder="Ghi chú: nước đang rút, xe không qua được..." value={updateNote} onChange={(e) => setUpdateNote(e.target.value)} sx={{ mb: 1, bgcolor: 'background.paper', borderRadius: 1.5 }} />

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
                                sx={{ minWidth: 0, px: 0.5, color: 'text.secondary', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                Chi tiết →
                            </Button>
                        </Stack>
                    </Box>
                </Collapse>
            </Card>
        );
    };

    const fetchOrgReports = async () => {
        setLoadingHistory(true);
        try {
            const res = await inundationApi.listReports();
            if (res.data?.status === 'success') {
                setOrgReports(res.data.data?.data || []);
            }
        } catch (error) {
            toast.error('Lỗi khi tải lịch sử báo cáo');
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (activeTab === 2) {
            fetchOrgReports();
        }
    }, [activeTab]);

    if (activeTab === 2) {
        return (
            <Box sx={{ px: 2, pt: 2, pb: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Lịch sử báo cáo toàn trạm</Typography>
                </Box>

                {loadingHistory ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : orgReports.length === 0 ? (
                    <Typography color="textSecondary" align="center" sx={{ py: 4, fontStyle: 'italic' }}>Chưa có báo cáo nào được ghi nhận.</Typography>
                ) : (
                    <List sx={{ p: 0 }}>
                        {orgReports.map((report) => (
                            <Card
                                key={report.id}
                                sx={{ mb: 2, borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform .2s', '&:hover': { transform: 'scale(1.01)' } }}
                                onClick={() => navigate(`${basePath}/inundation/form?id=` + report.id + '&tab=1')}
                            >
                                <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
                                    <Avatar sx={{ bgcolor: report.status === 'active' ? 'error.lighter' : 'success.lighter', color: report.status === 'active' ? 'error.main' : 'success.main', width: 44, height: 44 }}>
                                        {report.status === 'active' ? <IconAlertTriangle size={20} /> : <IconClock size={20} />}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', mb: 0.5 }}>{report.street_name || report.address || 'Không rõ vị trí'}</Typography>
                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <IconClock size={14} /> Ghi nhận: {new Date(report.start_time * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Chip label={report.status === 'active' ? 'Đang theo dõi' : 'Đã kết thúc'} size="small" color={report.status === 'active' ? 'error' : 'success'} sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                                            <Typography variant="caption" sx={{ bgcolor: 'grey.100', px: 1, py: 0.5, borderRadius: 1, fontWeight: 700 }}>TG: {report.user_email?.split('@')[0] || 'Unknown'}</Typography>
                                        </Stack>
                                    </Box>
                                </Box>
                            </Card>
                        ))}
                    </List>
                )}
            </Box>
        );
    }

    if (activeTab === 3) {
        return (
            <Box sx={{ px: 2, pt: 4, textAlign: 'center' }}>
                <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                    <IconUser size={40} />
                </Avatar>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Cán bộ kỹ thuật</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>Phòng Thoát Nước Hà Nội</Typography>

                <List sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', mb: 4 }}>
                    <ListItem button onClick={() => toast.success('Tính năng đang phát triển')}>
                        <ListItemIcon><IconUser size={20} color={theme.palette.primary.main} /></ListItemIcon>
                        <ListItemText primary="Thông tin cá nhân" />
                        <IconChevronRight size={20} style={{ color: theme.palette.text.disabled }} />
                    </ListItem>
                    <Divider variant="middle" />
                    <ListItem button onClick={handleLogout} sx={{ color: 'error.main' }}>
                        <ListItemIcon><IconLogout size={20} color={theme.palette.error.main} /></ListItemIcon>
                        <ListItemText primary="Đăng xuất" />
                        <IconChevronRight size={20} style={{ color: theme.palette.text.disabled }} />
                    </ListItem>
                </List>
            </Box>
        );
    }

    return (
        <Box sx={{ px: 2, pt: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>Trực ngập lụt</Typography>
                <Badge badgeContent={stats.active} color="error" max={99}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'error.lighter', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconAlertTriangle size={16} color={theme.palette.error.main} />
                    </Box>
                </Badge>
            </Box>

            {/* Filter chips */}
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label={`Tất cả (${stats.total})`} size="small" variant={activeTab === 0 ? 'filled' : 'outlined'} color="primary" onClick={() => navigate(`${basePath}/inundation`)} sx={{ fontWeight: 700, height: 26, fontSize: '0.72rem', cursor: 'pointer' }} />
                <Chip label={`Đang ngập (${stats.active})`} size="small" color="error" variant={activeTab === 1 ? 'filled' : 'outlined'} onClick={() => navigate(`${basePath}/inundation?activeTab=1`)} sx={{ fontWeight: 700, height: 26, fontSize: '0.72rem', cursor: 'pointer' }} />
            </Stack>

            {/* Search box */}
            <TextField
                fullWidth
                size="small"
                placeholder="Tìm kiếm theo tên đường, địa chỉ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2, bgcolor: 'background.paper', borderRadius: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                InputProps={{
                    startAdornment: <IconSearch size={16} sx={{ color: 'text.disabled', mr: 1, fontSize: '1.1rem' }} />,
                    endAdornment: searchQuery ? (
                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                            <IconX size={16} />
                        </IconButton>
                    ) : null
                }}
            />

            <Stack spacing={1.5}>
                {loading ? [1, 2, 3].map(i => <Skeleton key={i} height={100} sx={{ borderRadius: 2 }} />) :
                    filteredPoints.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <Typography color="textSecondary" sx={{ fontStyle: 'italic' }}>Không có dữ liệu.</Typography>
                        </Box>
                    ) : filteredPoints.map(point => <PointCard key={point.id} point={point} />)
                }
            </Stack>
        </Box>
    );
};

export default InundationDashboard;
