import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, Stack, TextField, MenuItem,
    CircularProgress, Button, InputAdornment, TablePagination, Skeleton,
    Dialog, DialogContent, IconButton, Collapse, useTheme, useMediaQuery, Grid
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { IconSearch, IconClock, IconAlertTriangle, IconX, IconChevronLeft, IconChevronRight, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import inundationApi from 'api/inundation';
import organizationApi from 'api/organization';
import { getInundationImageUrl } from 'utils/imageHelper';
import { getTrafficStatusColor, getTrafficStatusLabel } from 'utils/trafficStatusHelper';
import { toast } from 'react-hot-toast';

const getLatestData = (report) => {
    if (!report) return null;
    const data = { ...report, traffic_status: report.traffic_status || report.trafficStatus };
    
    // Sort updates by timestamp newest first
    const sortedUpdates = report.updates && report.updates.length > 0 
        ? [...report.updates].sort((a, b) => b.timestamp - a.timestamp) 
        : [];

    if (sortedUpdates.length > 0) {
        const latestUpdate = sortedUpdates[0];
        
        // Find most recent dimensions
        const updateWithDimensions = sortedUpdates.find(u => u.length || u.width || u.depth);
        // Find most recent traffic status
        const updateWithTraffic = sortedUpdates.find(u => u.traffic_status || u.trafficStatus);
        // Find most recent images
        const updateWithImages = sortedUpdates.find(u => u.images && u.images.length > 0);

        return {
            ...data,
            depth: updateWithDimensions?.depth || data.depth,
            length: updateWithDimensions?.length || data.length,
            width: updateWithDimensions?.width || data.width,
            traffic_status: (updateWithTraffic?.traffic_status || updateWithTraffic?.trafficStatus) || data.traffic_status,
            images: (updateWithImages?.images && updateWithImages.images.length > 0) ? updateWithImages.images : (data.images || []),
            description: latestUpdate.description || data.description,
            timestamp: latestUpdate.timestamp
        };
    }
    return data;
};

const CollapsiblePointRow = ({ point, organizations, formatTime, handleOpenViewer, navigate, isMobile }) => {
    const [open, setOpen] = useState(isMobile && point.status === 'active');
    const latest = useMemo(() => getLatestData(point.active_report || point.last_report), [point]);

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
                <TableCell sx={{ width: 40, p: { xs: 1, md: 2 } }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: { xs: '0.875rem', md: 'inherit' } }}>{point.name}</Typography>
                    {isMobile && (
                        <Typography variant="body2" color="primary" sx={{ mt: 0.5 }}>
                            {point.org_name || organizations.find(o => o.id === point.org_id)?.name || ''}
                        </Typography>
                    )}
                </TableCell>
                {!isMobile && (
                    <>
                        <TableCell><Typography variant="body2" color="primary">{point.org_name || organizations.find(o => o.id === point.org_id)?.name || ''}</Typography></TableCell>
                        <TableCell><Chip label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'} color={point.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                        <TableCell>{latest?.traffic_status && <Chip label={getTrafficStatusLabel(latest.traffic_status)} size="small" color={getTrafficStatusColor(latest.traffic_status)} variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem', opacity: point.status === 'active' ? 1 : 0.7 }} />}</TableCell>
                    </>
                )}
                {!isMobile && (
                    <TableCell align="right" sx={{ p: { xs: 1, md: 2 } }}>
                        <Button size="small" variant="text" onClick={() => navigate(`/admin/inundation/form?id=${point.active_report?.id || point.last_report_id}&tab=1&readonly=true`)}>Xem chi tiết</Button>
                    </TableCell>
                )}
            </TableRow>
            <TableRow>
                <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', paddingBottom: 0, paddingTop: 0 }} colSpan={isMobile ? 2 : 6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: { xs: 1, md: 2 }, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 700, color: 'primary.main', mb: 2, fontSize: { xs: '0.875rem', md: 'inherit' } }}>
                                {point.address}
                            </Typography>
                            <Stack spacing={1.5}>
                                {isMobile && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                        <Chip label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'} color={point.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} />
                                        {latest?.traffic_status && (
                                            <Chip label={getTrafficStatusLabel(latest.traffic_status)} size="small" color={getTrafficStatusColor(latest.traffic_status)} variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem' }} />
                                        )}
                                    </Stack>
                                )}
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Kích thước ngập:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {latest ? `${latest.length || 0}m x ${latest.width || 0}m x ${latest.depth || 0}m` : '-'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Thời gian bắt đầu:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {latest ? formatTime(latest.start_time) : '-'}
                                        </Typography>
                                        {point.status === 'active' && latest?.timestamp && (
                                             <Typography variant="caption" color="error" sx={{ fontWeight: 600, display: 'block' }}>
                                                 Cập nhật lúc: {formatTime(latest.timestamp)}
                                             </Typography>
                                         )}
                                    </Grid>
                                </Grid>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ảnh liên quan:</Typography>
                                    {latest?.images?.length > 0 ? (
                                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                                            {latest.images.map((img, idx) => (
                                                <Box key={idx} component="img" src={getInundationImageUrl(img)} onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.images, idx); }} sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'divider', flexShrink: 0 }} />
                                            ))}
                                        </Stack>
                                    ) : <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Không có ảnh</Typography>}
                                </Box>
                                {isMobile && (
                                    <Box sx={{ mt: 1, textAlign: 'right' }}>
                                        <Button size="small" variant="contained" color="primary" onClick={() => navigate(`/admin/inundation/form?id=${point.active_report?.id || point.last_report_id}&tab=1&readonly=true`)}>Xem chi tiết</Button>
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

const CollapsibleHistoryRow = ({ report, organizations, formatTime, handleOpenViewer, navigate, isMobile }) => {
    const [open, setOpen] = useState(isMobile && report.status === 'active');
    return (
        <React.Fragment>
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
                <TableCell sx={{ width: 40, p: { xs: 1, md: 2 } }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: { xs: '0.875rem', md: 'inherit' } }}>{report.street_name}</Typography>
                    {isMobile && (
                        <Typography variant="body2" color="primary" sx={{ mt: 0.5 }}>
                            {organizations.find(o => o.id === report.org_id)?.name || report.org_id}
                        </Typography>
                    )}
                </TableCell>
                {!isMobile && (
                    <>
                        <TableCell><Typography variant="body2" color="primary">{organizations.find(o => o.id === report.org_id)?.name || report.org_id}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{formatTime(report.start_time)}</Typography></TableCell>
                        <TableCell><Chip label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'} color={report.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                    </>
                )}
                {!isMobile && (
                    <TableCell align="right" sx={{ p: { xs: 1, md: 2 } }}>
                        <Button size="small" variant="text" onClick={() => navigate(`/admin/inundation/form?id=${report.id}&tab=1&readonly=true`)}>Xem chi tiết</Button>
                    </TableCell>
                )}
            </TableRow>
            <TableRow>
                <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', paddingBottom: 0, paddingTop: 0 }} colSpan={isMobile ? 2 : 6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: { xs: 1, md: 2 }, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 700, color: 'primary.main', mb: 2, fontSize: { xs: '0.875rem', md: 'inherit' } }}>
                                Chi tiết báo cáo
                            </Typography>
                            <Stack spacing={1.5}>
                                {isMobile && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                        <Chip label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'} color={report.status === 'active' ? 'error' : 'success'} size="small" sx={{ fontWeight: 700 }} />
                                        <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Bắt đầu:</strong> {formatTime(report.start_time)}</Typography>
                                    </Stack>
                                )}
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Kích thước ngập:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{`${report.length || 0}m x ${report.width || 0}m x ${report.depth || 0}m`}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Giao thông:</Typography>
                                        {report.traffic_status ? (
                                            <Chip label={getTrafficStatusLabel(report.traffic_status)} size="small" color={getTrafficStatusColor(report.traffic_status)} variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem', mt: 0.5 }} />
                                        ) : <Typography variant="body2" sx={{ fontWeight: 600 }}>-</Typography>}
                                    </Grid>
                                </Grid>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ảnh liên quan:</Typography>
                                    {report.images?.length > 0 ? (
                                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                                            {report.images.map((img, idx) => (
                                                <Box key={idx} component="img" src={getInundationImageUrl(img)} onClick={(e) => { e.stopPropagation(); handleOpenViewer(report.images, idx); }} sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'divider', flexShrink: 0 }} />
                                            ))}
                                        </Stack>
                                    ) : <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>Không có ảnh</Typography>}
                                </Box>
                                {isMobile && (
                                    <Box sx={{ mt: 1, textAlign: 'right' }}>
                                        <Button size="small" variant="contained" color="primary" onClick={() => navigate(`/admin/inundation/form?id=${report.id}&tab=1&readonly=true`)}>Xem chi tiết</Button>
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

const InundationAdminList = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [activeTab, setActiveTab] = useState(0); // 0 = Điểm trực, 1 = Lịch sử báo cáo

    // Orgs
    const [organizations, setOrganizations] = useState([]);
    const [orgFilter, setOrgFilter] = useState('');

    // Points State
    const [loadingPoints, setLoadingPoints] = useState(true);
    const [points, setPoints] = useState([]);

    // History State
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyReports, setHistoryReports] = useState([]);
    const [totalHistory, setTotalHistory] = useState(0);
    const [historyPage, setHistoryPage] = useState(0);
    const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);

    // Global Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [trafficFilter, setTrafficFilter] = useState('');

    // Viewer
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });

    const fetchOrgs = async () => {
        try {
            const res = await organizationApi.getAll({ page: 1, size: 1000 });
            if (res.data?.status === 'success') {
                setOrganizations(res.data.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch orgs:', error);
        }
    };

    const fetchPoints = async () => {
        setLoadingPoints(true);
        try {
            const params = {};
            if (orgFilter) params.org_id = orgFilter;
            const response = await inundationApi.getPointsStatus(params);
            setPoints(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch points:', error);
        } finally {
            setLoadingPoints(false);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await inundationApi.listReports(historyPage, historyRowsPerPage, {
                status: statusFilter,
                traffic_status: trafficFilter,
                query: searchQuery,
                org_id: orgFilter
            });
            if (res.data?.status === 'success') {
                setHistoryReports(res.data.data.data || []);
                setTotalHistory(res.data.data.total || 0);
            }
        } catch (error) {
            toast.error('Lỗi khi tải lịch sử báo cáo');
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, []);

    useEffect(() => {
        fetchPoints();
    }, [orgFilter]);

    useEffect(() => {
        if (activeTab === 1) fetchHistory();
    }, [activeTab, historyPage, historyRowsPerPage, statusFilter, trafficFilter, searchQuery, orgFilter]);

    const filteredPoints = useMemo(() => {
        let result = points;
        if (statusFilter) {
            result = result.filter(p => p.status === statusFilter);
        }
        if (trafficFilter) {
            result = result.filter(p => {
                const ts = p.active_report?.traffic_status || p.active_report?.trafficStatus;
                return ts === trafficFilter;
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
    }, [points, searchQuery, statusFilter, trafficFilter]);

    const formatTime = (ts) => {
        if (!ts) return '-';
        return new Date(ts * 1000).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    };

    const handleOpenViewer = (imgs, idx = 0) => {
        if (!imgs || imgs.length === 0) return;
        setViewer({ open: true, images: imgs, index: idx });
    };
    const handleCloseViewer = () => setViewer({ ...viewer, open: false });
    const handlePrev = (e) => { e?.stopPropagation(); setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length })); };
    const handleNext = (e) => { e?.stopPropagation(); setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length })); };

    const renderImageViewer = () => (
        <Dialog open={viewer.open} onClose={handleCloseViewer} maxWidth="lg">
            <IconButton onClick={handleCloseViewer} sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.5)' }}>
                <IconX size={20} />
            </IconButton>
            <DialogContent sx={{ p: 0, bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', position: 'relative' }}>
                {viewer.images.length > 1 && (
                    <>
                        <IconButton onClick={handlePrev} sx={{ position: 'absolute', left: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}><IconChevronLeft size={32} /></IconButton>
                        <IconButton onClick={handleNext} sx={{ position: 'absolute', right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}><IconChevronRight size={32} /></IconButton>
                    </>
                )}
                <Box component="img" src={getInundationImageUrl(viewer.images[viewer.index])} sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }} />
            </DialogContent>
        </Dialog>
    );

    return (
        <MainCard
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconAlertTriangle size={24} color="red" />
                        <Typography variant="h3" sx={{ fontWeight: 800 }}>## TRỰC NGẬP LỤT HÀ NỘI</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <Chip label="Điểm trực" variant={activeTab === 0 ? 'filled' : 'outlined'} color="primary" onClick={() => setActiveTab(0)} sx={{ fontWeight: 700, cursor: 'pointer' }} />
                        <Chip label="Lịch sử báo cáo" variant={activeTab === 1 ? 'filled' : 'outlined'} color="primary" onClick={() => setActiveTab(1)} sx={{ fontWeight: 700, cursor: 'pointer' }} />
                    </Stack>
                </Box>
            }
        >
            <Box sx={{ mb: 3 }}>
                <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center" flexWrap="wrap" useFlexGap>
                    <TextField
                        placeholder="Tìm tên đường, vị trí..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        sx={{ width: { xs: '100%', sm: 250 } }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> }}
                    />

                    <TextField
                        select
                        label="Đơn vị quản lý"
                        value={orgFilter}
                        onChange={(e) => { setOrgFilter(e.target.value); setHistoryPage(0); }}
                        size="small"
                        sx={{ width: { xs: '100%', sm: 180 } }}
                    >
                        <MenuItem value="">Tất cả đơn vị</MenuItem>
                        {organizations.map(org => (
                            <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Trạng thái"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setHistoryPage(0); }}
                        size="small"
                        sx={{ width: { xs: '100%', sm: 150 } }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="active">Đang ngập</MenuItem>
                        {activeTab === 0 ? <MenuItem value="normal">Bình thường</MenuItem> : <MenuItem value="resolved">Đã kết thúc</MenuItem>}
                    </TextField>

                    <TextField
                        select
                        label="Giao thông"
                        value={trafficFilter}
                        onChange={(e) => { setTrafficFilter(e.target.value); setHistoryPage(0); }}
                        size="small"
                        sx={{ width: { xs: '100%', sm: 180 } }}
                    >
                        <MenuItem value="">Tất cả giao thông</MenuItem>
                        <MenuItem value="Đi lại bình thường">Đi lại bình thường</MenuItem>
                        <MenuItem value="Đi lại khó khăn">Đi lại khó khăn</MenuItem>
                        <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
                    </TextField>

                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', ml: { xs: 0, sm: 'auto' } }}>
                        {activeTab === 0 ? `Hiển thị: ${filteredPoints.length} điểm` : `Tổng cộng: ${totalHistory} báo cáo`}
                    </Typography>
                </Stack>
            </Box>

            {/* Section 1: Điểm trực */}
            {activeTab === 0 && (
                <>
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>Danh sách điểm trực</Typography>
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 4, '& .MuiTableCell-root': { fontSize: { xs: '0.875rem' } } }}>
                        <Table sx={{ minWidth: isMobile ? 300 : 800 }}>
                            <TableHead sx={{ bgcolor: 'grey.50' }}>
                                <TableRow>
                                    <TableCell sx={{ width: 40 }} />
                                    <TableCell sx={{ fontWeight: 700 }}>Điểm trực ngập</TableCell>
                                    {!isMobile && (
                                        <>
                                            <TableCell sx={{ fontWeight: 700, width: 250 }}>Đơn vị quản lý</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="center">Giao thông</TableCell>
                                            <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">Thao tác</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loadingPoints ? [1, 2, 3].map(i => <TableRow key={i}><TableCell colSpan={isMobile ? 3 : 6}><Skeleton height={40} /></TableCell></TableRow>) :
                                    filteredPoints.length === 0 ? <TableRow><TableCell colSpan={isMobile ? 3 : 6} align="center">Trống</TableCell></TableRow> :
                                        filteredPoints.map(point => (
                                            <CollapsiblePointRow
                                                key={point.id}
                                                point={point}
                                                organizations={organizations}
                                                formatTime={formatTime}
                                                handleOpenViewer={handleOpenViewer}
                                                navigate={navigate}
                                                isMobile={isMobile}
                                            />
                                        ))
                                }
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}

            {/* Section 2: Lịch sử báo cáo */}
            {activeTab === 1 && (
                <>
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>Lịch sử báo cáo toàn thành phố</Typography>
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '& .MuiTableCell-root': { fontSize: { xs: '0.875rem' } } }}>
                        <Table sx={{ minWidth: isMobile ? 300 : 800 }}>
                            <TableHead sx={{ bgcolor: 'grey.50' }}>
                                <TableRow>
                                    <TableCell sx={{ width: 40 }} />
                                    <TableCell sx={{ fontWeight: 700 }}>Tuyến đường / Điểm</TableCell>
                                    {!isMobile && (
                                        <>
                                            <TableCell sx={{ fontWeight: 700 }}>Đơn vị quản lý</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Thao tác</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loadingHistory ? [1, 2, 3].map(i => <TableRow key={i}><TableCell colSpan={isMobile ? 3 : 6}><Skeleton height={40} /></TableCell></TableRow>) :
                                    historyReports.length === 0 ? <TableRow><TableCell colSpan={isMobile ? 3 : 6} align="center">Trống</TableCell></TableRow> :
                                        historyReports.map(report => (
                                            <CollapsibleHistoryRow
                                                key={report.id}
                                                report={report}
                                                organizations={organizations}
                                                formatTime={formatTime}
                                                handleOpenViewer={handleOpenViewer}
                                                navigate={navigate}
                                                isMobile={isMobile}
                                            />
                                        ))
                                }
                            </TableBody>
                        </Table>
                        <TablePagination rowsPerPageOptions={[10, 25, 50]} component="div" count={totalHistory} rowsPerPage={historyRowsPerPage} page={historyPage} onPageChange={(e, p) => setHistoryPage(p)} onRowsPerPageChange={(e) => { setHistoryRowsPerPage(parseInt(e.target.value, 10)); setHistoryPage(0); }} labelRowsPerPage="Dòng mỗi trang:" />
                    </TableContainer>
                </>
            )}
            {renderImageViewer()}
        </MainCard>
    );
};

export default InundationAdminList;
