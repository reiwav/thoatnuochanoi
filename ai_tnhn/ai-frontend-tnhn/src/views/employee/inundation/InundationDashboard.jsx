import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import React from 'react';
import {
    Box,
    Typography,
    Chip,
    Stack,
    IconButton,
    Divider,
    Collapse,
    TextField,
    Button,
    CircularProgress,
    Skeleton,
    Avatar,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Badge,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogContent,
    TablePagination,
    MenuItem,
    Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
    IconChevronUp,
    IconChevronDown,
    IconX,
    IconSearch,
    IconAlertTriangle,
    IconUser,
    IconChevronRight,
    IconChevronLeft,
    IconLogout
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import inundationApi from 'api/inundation';
import organizationApi from 'api/organization';
import MainCard from 'ui-component/cards/MainCard';

import { getInundationImageUrl } from 'utils/imageHelper';
import { getTrafficStatusColor, getTrafficStatusLabel } from 'utils/trafficStatusHelper';

const CollapsiblePointRow = ({ point, organizations, formatTime, getDuration, handleOpenViewer, navigate, isMobile, basePath }) => {
    const [open, setOpen] = useState(false);
    return (
        <React.Fragment>
            <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell sx={{ width: 40, p: { xs: 1, md: 2 } }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {point.name}
                    </Typography>
                    {isMobile && (
                        <Typography variant="body2" color="primary" sx={{ mt: 0.5 }}>
                            {point.org_name || organizations.find((o) => o.id === point.org_id)?.name || ''}
                        </Typography>
                    )}
                </TableCell>
                {!isMobile && (
                    <>
                        <TableCell>
                            <Typography variant="body2" color="primary">
                                {point.org_name || organizations.find((o) => o.id === point.org_id)?.name || ''}
                            </Typography>
                        </TableCell>
                        <TableCell>
                            <Chip
                                label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'}
                                color={point.status === 'active' ? 'error' : 'success'}
                                size="small"
                                sx={{ fontWeight: 700 }}
                            />
                        </TableCell>
                        <TableCell>
                            {(point.active_report?.traffic_status || point.active_report?.trafficStatus) && (
                                <Chip
                                    label={getTrafficStatusLabel(point.active_report.traffic_status || point.active_report.trafficStatus)}
                                    size="small"
                                    color={getTrafficStatusColor(point.active_report.traffic_status || point.active_report.trafficStatus)}
                                    variant="outlined"
                                    sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                                />
                            )}
                        </TableCell>
                    </>
                )}
                {!isMobile && (
                    <TableCell align="right" sx={{ p: { xs: 1, md: 2 } }}>
                        <Button
                            variant={point.status === 'active' ? 'contained' : 'outlined'}
                            color={point.status === 'active' ? 'error' : 'primary'}
                            size="small"
                            onClick={() =>
                                navigate(
                                    point.status === 'active'
                                        ? `${basePath}/inundation/form?tab=1&id=${point.active_report.id}&name=${encodeURIComponent(point.name)}`
                                        : `${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`
                                )
                            }
                            sx={{ fontWeight: 700 }}
                        >
                            {point.status === 'active' ? 'Cập nhật' : 'Báo cáo'}
                        </Button>
                    </TableCell>
                )}
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={isMobile ? 3 : 6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: { xs: 1, md: 2 }, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
                                {point.address}
                            </Typography>
                            <Stack spacing={1.5}>
                                {isMobile && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                        <Chip
                                            label={point.status === 'active' ? 'Đang ngập' : 'Bình thường'}
                                            color={point.status === 'active' ? 'error' : 'success'}
                                            size="small"
                                            sx={{ fontWeight: 700 }}
                                        />
                                        {(point.active_report?.traffic_status || point.active_report?.trafficStatus) && (
                                            <Chip
                                                label={getTrafficStatusLabel(point.active_report.traffic_status || point.active_report.trafficStatus)}
                                                size="small"
                                                color={getTrafficStatusColor(point.active_report.traffic_status || point.active_report.trafficStatus)}
                                                variant="outlined"
                                                sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                                            />
                                        )}
                                    </Stack>
                                )}
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            Kích thước ngập:
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {point.status === 'active'
                                                ? `${point.active_report?.length || 0}m x ${point.active_report?.width || 0}m x ${point.active_report?.depth || 0}m`
                                                : '-'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            Thời gian bắt đầu:
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {point.status === 'active' ? formatTime(point.active_report?.start_time) : '-'}
                                        </Typography>
                                        {point.status === 'active' && (
                                            <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
                                                Đã kéo dài: {getDuration(point.active_report?.start_time)}
                                            </Typography>
                                        )}
                                    </Grid>
                                </Grid>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        Ảnh liên quan:
                                    </Typography>
                                    {point.status === 'active' && point.active_report?.images?.length > 0 ? (
                                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                                            {point.active_report.images.map((img, idx) => (
                                                <Box
                                                    key={idx}
                                                    component="img"
                                                    src={getInundationImageUrl(img)}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenViewer(point.active_report.images, idx);
                                                    }}
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        borderRadius: 1.5,
                                                        objectFit: 'cover',
                                                        cursor: 'pointer',
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        flexShrink: 0
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>
                                            Không có ảnh
                                        </Typography>
                                    )}
                                </Box>
                                {isMobile && (
                                    <Box sx={{ mt: 1, textAlign: 'right' }}>
                                        <Button
                                            variant={point.status === 'active' ? 'contained' : 'contained'}
                                            color={point.status === 'active' ? 'error' : 'primary'}
                                            size="small"
                                            onClick={() =>
                                                navigate(
                                                    point.status === 'active'
                                                        ? `${basePath}/inundation/form?tab=1&id=${point.active_report.id}&name=${encodeURIComponent(point.name)}`
                                                        : `${basePath}/inundation/form?tab=0&point_id=${point.id}&name=${encodeURIComponent(point.name)}`
                                                )
                                            }
                                        >
                                            {point.status === 'active' ? 'Cập nhật' : 'Báo cáo'}
                                        </Button>
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

const CollapsibleHistoryRow = ({ report, organizations, formatTime, handleOpenViewer, navigate, isMobile, basePath }) => {
    const [open, setOpen] = useState(false);
    return (
        <React.Fragment>
            <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell sx={{ width: 40, p: { xs: 1, md: 2 } }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {report.street_name}
                    </Typography>
                    {isMobile && (
                        <Typography variant="body2" color="primary" sx={{ mt: 0.5 }}>
                            {organizations.find((o) => o.id === report.org_id)?.name || report.org_id}
                        </Typography>
                    )}
                </TableCell>
                {!isMobile && (
                    <>
                        <TableCell>
                            <Typography variant="body2" color="primary">
                                {organizations.find((o) => o.id === report.org_id)?.name || report.org_id}
                            </Typography>
                        </TableCell>
                        <TableCell>
                            <Typography variant="body2">{formatTime(report.start_time)}</Typography>
                        </TableCell>
                        <TableCell>
                            <Chip
                                label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'}
                                color={report.status === 'active' ? 'error' : 'success'}
                                size="small"
                                sx={{ fontWeight: 700 }}
                            />
                        </TableCell>
                    </>
                )}
                {!isMobile && (
                    <TableCell align="right" sx={{ p: { xs: 1, md: 2 } }}>
                        <Button size="small" variant="text" onClick={() => navigate(`${basePath}/inundation/form?id=${report.id}&tab=1&readonly=true`)}>
                            Xem chi tiết
                        </Button>
                    </TableCell>
                )}
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={isMobile ? 3 : 6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: { xs: 1, md: 2 }, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
                                Chi tiết báo cáo
                            </Typography>
                            <Stack spacing={1.5}>
                                {isMobile && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                        <Chip
                                            label={report.status === 'active' ? 'Đang ngập' : 'Đã kết thúc'}
                                            color={report.status === 'active' ? 'error' : 'success'}
                                            size="small"
                                            sx={{ fontWeight: 700 }}
                                        />
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            <strong>Bắt đầu:</strong> {formatTime(report.start_time)}
                                        </Typography>
                                    </Stack>
                                )}
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            Kích thước ngập:
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 600 }}
                                        >{`${report.length || 0}m x ${report.width || 0}m x ${report.depth || 0}m`}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            Giao thông:
                                        </Typography>
                                        {report.traffic_status ? (
                                            <Chip
                                                label={getTrafficStatusLabel(report.traffic_status)}
                                                size="small"
                                                color={getTrafficStatusColor(report.traffic_status)}
                                                variant="outlined"
                                                sx={{ fontWeight: 800, fontSize: '0.75rem', mt: 0.5 }}
                                            />
                                        ) : (
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                -
                                            </Typography>
                                        )}
                                    </Grid>
                                </Grid>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        Ảnh liên quan:
                                    </Typography>
                                    {report.images?.length > 0 ? (
                                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                                            {report.images.map((img, idx) => (
                                                <Box
                                                    key={idx}
                                                    component="img"
                                                    src={getInundationImageUrl(img)}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenViewer(report.images, idx);
                                                    }}
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        borderRadius: 1.5,
                                                        objectFit: 'cover',
                                                        cursor: 'pointer',
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        flexShrink: 0
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>
                                            Không có ảnh
                                        </Typography>
                                    )}
                                </Box>
                                {isMobile && (
                                    <Box sx={{ mt: 1, textAlign: 'right' }}>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="primary"
                                            onClick={() => navigate(`${basePath}/inundation/form?id=${report.id}&tab=1&readonly=true`)}
                                        >
                                            Xem chi tiết
                                        </Button>
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

    const [searchQuery, setSearchQuery] = useState('');
    const [historyStatus, setHistoryStatus] = useState('');
    const [historyTrafficStatus, setHistoryTrafficStatus] = useState('');
    const [orgFilter, setOrgFilter] = useState('');
    const [organizations, setOrganizations] = useState([]);

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
    const handlePrev = (e) => {
        e?.stopPropagation();
        setViewer((v) => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }));
    };
    const handleNext = (e) => {
        e?.stopPropagation();
        setViewer((v) => ({ ...v, index: (v.index + 1) % v.images.length }));
    };

    // Read activeTab from URL query
    const params = new URLSearchParams(search);
    const activeTab = parseInt(params.get('activeTab') || '0');

    const [orgReports, setOrgReports] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchOrgs = async () => {
        try {
            const res = await organizationApi.getAll({ page: 1, size: 1000 });
            if (res.data?.status === 'success') {
                setOrganizations(res.data.data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch orgs:', err);
        }
    };

    const fetchPoints = async () => {
        try {
            const params = {};
            if (orgFilter) params.org_id = orgFilter;
            const response = await inundationApi.getPointsStatus(params);
            setPoints(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch points:', err);
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
                query: searchQuery,
                org_id: orgFilter
            });
            if (res.data?.status === 'success') {
                const result = res.data.data;
                setOrgReports(result.data || []);
                setTotalHistory(result.total || 0);
            }
        } catch {
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
        if (activeTab === 2 || !isMobile) {
            fetchOrgReports();
        }
    }, [activeTab, historyPage, historyRowsPerPage, isMobile, historyStatus, historyTrafficStatus, searchQuery, orgFilter]);

    const stats = useMemo(() => {
        const total = points.length;
        const active = points.filter((p) => p.status === 'active').length;
        return { total, active, normal: total - active };
    }, [points]);

    const filteredPoints = useMemo(() => {
        let result = activeTab === 1 ? points.filter((p) => p.status === 'active') : points;

        if (historyStatus) {
            result = result.filter((p) => p.status === historyStatus);
        }

        if (historyTrafficStatus) {
            result = result.filter((p) => {
                const ts = p.active_report?.traffic_status || p.active_report?.trafficStatus;
                return ts === historyTrafficStatus;
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) => p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q));
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/pages/login');
    };

    // ─── Render Logic ─────────────────────────────────────────────────────────

    const renderHistoryTable = () => (
        <Box>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
                <TextField
                    size="small"
                    placeholder="Tìm tên đường..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: 250 }}
                    InputProps={{ startAdornment: <IconSearch size={16} sx={{ mr: 1, color: 'text.disabled' }} /> }}
                />
                {userRole !== 'employee' && (
                    <TextField
                        select
                        size="small"
                        label="Đơn vị quản lý"
                        value={orgFilter}
                        onChange={(e) => {
                            setOrgFilter(e.target.value);
                            setHistoryPage(0);
                        }}
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        {organizations.map((org) => (
                            <MenuItem key={org.id} value={org.id}>
                                {org.name}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
                <TextField
                    select
                    size="small"
                    label="Trạng thái"
                    value={historyStatus}
                    onChange={(e) => {
                        setHistoryStatus(e.target.value);
                        setHistoryPage(0);
                    }}
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="active">Đang ngập</MenuItem>
                    <MenuItem value="resolved">Đã kết thúc</MenuItem>
                </TextField>
                <TextField
                    select
                    size="small"
                    label="Giao thông"
                    value={historyTrafficStatus}
                    onChange={(e) => {
                        setHistoryTrafficStatus(e.target.value);
                        setHistoryPage(0);
                    }}
                    sx={{ minWidth: 180 }}
                >
                    <MenuItem value="">Tất cả giao thông</MenuItem>
                    <MenuItem value="Đi lại bình thường">Đi lại bình thường</MenuItem>
                    <MenuItem value="Đi lại khó khăn">Đi lại khó khăn</MenuItem>
                    <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
                </TextField>
            </Stack>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
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
                                </>
                            )}
                            {!isMobile && (
                                <TableCell sx={{ fontWeight: 700 }} align="right">
                                    Thao tác
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loadingHistory ? (
                            <TableRow>
                                <TableCell colSpan={isMobile ? 3 : 6} align="center" sx={{ py: 3 }}>
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        ) : orgReports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isMobile ? 3 : 6} align="center" sx={{ py: 3 }}>
                                    Không có dữ liệu lịch sử
                                </TableCell>
                            </TableRow>
                        ) : (
                            orgReports.map((report) => (
                                <CollapsibleHistoryRow
                                    key={report.id}
                                    report={report}
                                    organizations={organizations}
                                    formatTime={formatTime}
                                    handleOpenViewer={handleOpenViewer}
                                    navigate={navigate}
                                    isMobile={isMobile}
                                    basePath={basePath}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={totalHistory}
                    rowsPerPage={historyRowsPerPage}
                    page={historyPage}
                    onPageChange={(e, p) => setHistoryPage(p)}
                    onRowsPerPageChange={(e) => {
                        setHistoryRowsPerPage(parseInt(e.target.value, 10));
                        setHistoryPage(0);
                    }}
                    labelRowsPerPage="Dòng mỗi trang:"
                />
            </TableContainer>
        </Box>
    );

    const renderImageViewer = () => (
        <Dialog
            open={viewer.open}
            onClose={handleCloseViewer}
            maxWidth="lg"
            PaperProps={{ sx: { bgcolor: 'black', borderRadius: 4, overflow: 'hidden', position: 'relative' } }}
        >
            <IconButton
                onClick={handleCloseViewer}
                sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 10,
                    color: 'white',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                }}
            >
                <IconX size={20} />
            </IconButton>
            <DialogContent
                sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', position: 'relative' }}
            >
                {viewer.images.length > 1 && (
                    <>
                        <IconButton
                            onClick={handlePrev}
                            sx={{ position: 'absolute', left: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}
                        >
                            <IconChevronLeft size={32} />
                        </IconButton>
                        <IconButton
                            onClick={handleNext}
                            sx={{ position: 'absolute', right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}
                        >
                            <IconChevronRight size={32} />
                        </IconButton>
                    </>
                )}
                <Box
                    component="img"
                    src={getInundationImageUrl(viewer.images[viewer.index])}
                    sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
                />
                <Box sx={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
                    <Typography
                        sx={{
                            color: 'white',
                            bgcolor: 'rgba(0,0,0,0.5)',
                            display: 'inline-block',
                            px: 2,
                            py: 0.5,
                            borderRadius: 10,
                            fontSize: '0.85rem'
                        }}
                    >
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
                            <Chip
                                label="Điểm trực"
                                variant={activeTab === 0 ? 'filled' : 'outlined'}
                                color="primary"
                                onClick={() => navigate(`${basePath}/inundation`)}
                                sx={{ fontWeight: 700 }}
                            />
                            <Chip
                                label="Lịch sử báo cáo"
                                variant={activeTab === 2 ? 'filled' : 'outlined'}
                                color="primary"
                                onClick={() => navigate(`${basePath}/inundation?activeTab=2`)}
                                sx={{ fontWeight: 700 }}
                            />
                        </Stack>
                    </Box>
                }
            >
                {activeTab === 2 ? (
                    renderHistoryTable()
                ) : (
                    <>
                        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                size="small"
                                placeholder="Tìm kiếm điểm ngập..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{ width: 260 }}
                                InputProps={{ startAdornment: <IconSearch size={16} sx={{ mr: 1, color: 'text.disabled' }} /> }}
                            />
                            {userRole !== 'employee' && (
                                <TextField
                                    select
                                    size="small"
                                    label="Đơn vị quản lý"
                                    value={orgFilter}
                                    onChange={(e) => setOrgFilter(e.target.value)}
                                    sx={{ minWidth: 150 }}
                                >
                                    <MenuItem value="">Tất cả đơn vị</MenuItem>
                                    {organizations.map((org) => (
                                        <MenuItem key={org.id} value={org.id}>
                                            {org.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                            <TextField
                                select
                                size="small"
                                label="Trạng thái"
                                value={historyStatus}
                                onChange={(e) => setHistoryStatus(e.target.value)}
                                sx={{ minWidth: 150 }}
                            >
                                <MenuItem value="">Tất cả</MenuItem>
                                <MenuItem value="active">Đang ngập</MenuItem>
                                <MenuItem value="normal">Bình thường</MenuItem>
                            </TextField>
                            <TextField
                                select
                                size="small"
                                label="Giao thông"
                                value={historyTrafficStatus}
                                onChange={(e) => setHistoryTrafficStatus(e.target.value)}
                                sx={{ minWidth: 200 }}
                            >
                                <MenuItem value="">Tất cả giao thông</MenuItem>
                                <MenuItem value="Đi lại bình thường">Đi lại bình thường</MenuItem>
                                <MenuItem value="Đi lại khó khăn">Đi lại khó khăn</MenuItem>
                                <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
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
                            <Table sx={{ minWidth: isMobile ? 300 : 800 }}>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell sx={{ width: 40 }} />
                                        <TableCell sx={{ fontWeight: 700 }}>Điểm trực ngập</TableCell>
                                        {!isMobile && (
                                            <>
                                                <TableCell sx={{ fontWeight: 700 }}>Đơn vị quản lý</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Giao thông</TableCell>
                                            </>
                                        )}
                                        {!isMobile && (
                                            <TableCell sx={{ fontWeight: 700 }} align="right">
                                                Thao tác
                                            </TableCell>
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading
                                        ? [1, 2, 3].map((i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={isMobile ? 3 : 6}>
                                                    <Skeleton height={40} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                        : filteredPoints.map((point) => (
                                            <CollapsiblePointRow
                                                key={point.id}
                                                point={point}
                                                organizations={organizations}
                                                formatTime={formatTime}
                                                getDuration={getDuration}
                                                handleOpenViewer={handleOpenViewer}
                                                navigate={navigate}
                                                isMobile={isMobile}
                                                basePath={basePath}
                                            />
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
                    <Typography variant="h3" sx={{ fontWeight: 900 }}>
                        Lịch sử báo cáo
                    </Typography>
                </Box>
                {renderHistoryTable()}
                {renderImageViewer()}
            </Box>
        );
    }

    if (activeTab === 3) {
        return (
            <Box sx={{ px: 2, pt: 4, textAlign: 'center' }}>
                <Avatar sx={{ width: 96, height: 96, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                    <IconUser size={48} />
                </Avatar>
                <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5 }}>
                    {userInfo?.name || 'Cán bộ kỹ thuật'}
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                    {userInfo?.email || 'Phòng Thoát Nước Hà Nội'}
                </Typography>
                <List sx={{ bgcolor: 'background.paper', borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 4, overflow: 'hidden' }}>
                    <ListItem button sx={{ py: 2 }}>
                        <ListItemIcon>
                            <IconUser size={26} color={theme.palette.primary.main} />
                        </ListItemIcon>
                        <ListItemText primary="Thông tin cá nhân" primaryTypographyProps={{ fontWeight: 700 }} />
                        <IconChevronRight size={20} />
                    </ListItem>
                    <Divider />
                    <ListItem button onClick={handleLogout} sx={{ color: 'error.main', py: 2 }}>
                        <ListItemIcon>
                            <IconLogout size={26} color={theme.palette.error.main} />
                        </ListItemIcon>
                        <ListItemText primary="Đăng xuất" primaryTypographyProps={{ fontWeight: 700 }} />
                        <IconChevronRight size={20} />
                    </ListItem>
                </List>
            </Box>
        );
    }

    return (
        <Box sx={{ px: 2, pt: 2, pb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h2" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: -0.5 }}>
                    Trực ngập lụt
                </Typography>
                <Badge badgeContent={stats.active} color="error" max={99} overlap="circular">
                    <Avatar sx={{ bgcolor: 'error.lighter', width: 40, height: 40 }}>
                        <IconAlertTriangle size={20} color={theme.palette.error.main} />
                    </Avatar>
                </Badge>
            </Box>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                    label={`Tất cả (${stats.total})`}
                    variant={activeTab === 0 ? 'filled' : 'outlined'}
                    color="primary"
                    onClick={() => navigate(`${basePath}/inundation`)}
                    sx={{ fontWeight: 800, height: 36, fontSize: '0.95rem' }}
                />
                <Chip
                    label={`Đang ngập (${stats.active})`}
                    color="error"
                    variant={activeTab === 1 ? 'filled' : 'outlined'}
                    onClick={() => navigate(`${basePath}/inundation?activeTab=1`)}
                    sx={{ fontWeight: 800, height: 36, fontSize: '0.95rem' }}
                />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                {userRole !== 'employee' && (
                    <TextField
                        select
                        size="small"
                        label="Đơn vị"
                        value={orgFilter}
                        onChange={(e) => setOrgFilter(e.target.value)}
                        sx={{ minWidth: 160, bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    >
                        <MenuItem value="">Tất cả đơn vị</MenuItem>
                        {organizations.map((org) => (
                            <MenuItem key={org.id} value={org.id}>
                                {org.name}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
                <TextField
                    select
                    fullWidth
                    size="small"
                    label="Trạng thái"
                    value={historyStatus}
                    onChange={(e) => setHistoryStatus(e.target.value)}
                    sx={{ bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="active">Đang ngập</MenuItem>
                    <MenuItem value="normal">Bình thường</MenuItem>
                </TextField>
                <TextField
                    select
                    fullWidth
                    size="small"
                    label="Giao thông"
                    value={historyTrafficStatus}
                    onChange={(e) => setHistoryTrafficStatus(e.target.value)}
                    sx={{ bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="Đi lại bình thường">Bình thường</MenuItem>
                    <MenuItem value="Đi lại khó khăn">Khó khăn</MenuItem>
                    <MenuItem value="Không đi lại được">Không đi lại được</MenuItem>
                </TextField>
            </Stack>
            <TextField
                fullWidth
                size="small"
                placeholder="Tìm tên đường, địa chỉ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2.5, bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                InputProps={{ startAdornment: <IconSearch size={18} sx={{ color: 'text.disabled', mr: 1 }} /> }}
            />
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table sx={{ minWidth: isMobile ? 300 : 800 }}>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ width: 40 }} />
                            <TableCell sx={{ fontWeight: 700 }}>Điểm trực ngập</TableCell>
                            {!isMobile && (
                                <>
                                    <TableCell sx={{ fontWeight: 700 }}>Đơn vị quản lý</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Giao thông</TableCell>
                                </>
                            )}
                            {!isMobile && (
                                <TableCell sx={{ fontWeight: 700 }} align="right">
                                    Thao tác
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading
                            ? [1, 2, 3].map((i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={isMobile ? 3 : 6}>
                                        <Skeleton height={40} />
                                    </TableCell>
                                </TableRow>
                            ))
                            : filteredPoints.map((point) => (
                                <CollapsiblePointRow
                                    key={point.id}
                                    point={point}
                                    organizations={organizations}
                                    formatTime={formatTime}
                                    getDuration={getDuration}
                                    handleOpenViewer={handleOpenViewer}
                                    navigate={navigate}
                                    isMobile={isMobile}
                                    basePath={basePath}
                                />
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {renderImageViewer()}
        </Box>
    );
};

export default InundationDashboard;
