import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import {
    Box, Typography, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    Button, CircularProgress, Chip, Grid,
    Stack, useMediaQuery, Card, CardContent, Divider,
    Avatar, List, ListItem, ListItemIcon, ListItemText, TextField, IconButton, Dialog, DialogContent, Autocomplete, Checkbox,
    TablePagination, Collapse
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconChevronRight, IconUser, IconLogout, IconSearch, IconX, IconRefresh, IconMapPin, IconChevronLeft, IconChevronDown, IconSquare, IconCheckbox, IconChevronUp } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import emergencyConstructionApi from 'api/emergencyConstruction';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import 'dayjs/locale/vi';
import dayjs from 'dayjs';
import { getInundationImageUrl } from 'utils/imageHelper';

const CollapsibleProgressRow = ({ h, isMobile, handleOpenViewer, theme }) => {
    const [open, setOpen] = useState(false);

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
                <TableCell sx={{ width: 40, p: { xs: 1, md: 2 } }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, p: { xs: 1, md: 2 } }}>{h.construction_name}</TableCell>
                <TableCell>{h.order || '-'}</TableCell>
                <TableCell>{h.reporter_name || '-'}</TableCell>
                <TableCell>{h.organization_name}</TableCell>
                <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.work_done}</TableCell>
                <TableCell align="right">
                    <Button size="small" variant="text" onClick={() => setOpen(!open)}>Chi tiết</Button>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: { xs: 1, md: 2 }, p: 3, bgcolor: 'grey.50', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', mb: 2 }}>Chi tiết báo cáo thi công</Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>NỘI DUNG CÔNG VIỆC:</Typography>
                                    <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>{h.work_done}</Typography>

                                    {h.location && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>VỊ TRÍ:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <IconMapPin size={16} /> {h.location}
                                            </Typography>
                                        </Box>
                                    )}
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    {h.conclusion && (
                                        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.lighter', borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                                            <Typography variant="caption" color="primary.dark" fontWeight={900} display="block" sx={{ mb: 0.5 }}>KẾT LUẬN:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{h.conclusion}</Typography>
                                        </Box>
                                    )}

                                    {h.issues && (
                                        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.lighter', borderRadius: 2, borderLeft: '4px solid', borderColor: 'error.main' }}>
                                            <Typography variant="caption" color="error.dark" fontWeight={900} display="block" sx={{ mb: 0.5 }}>VƯỚNG MẮC:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{h.issues}</Typography>
                                        </Box>
                                    )}
                                </Grid>

                                {h.images && h.images.length > 0 && (
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>HÌNH ẢNH HIỆN TRƯỜNG:</Typography>
                                        <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 4 } }}>
                                            {h.images.map((img, iidx) => (
                                                <Box
                                                    key={iidx} component="img" src={getInundationImageUrl(img)}
                                                    onClick={(e) => { e.stopPropagation(); handleOpenViewer(h.images, iidx); }}
                                                    sx={{ width: 120, height: 120, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider', cursor: 'zoom-in', transition: 'transform .2s', flexShrink: 0, '&:hover': { transform: 'scale(1.05)', zIndex: 2 } }}
                                                />
                                            ))}
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

const ConstructionReporting = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const { search } = useLocation();
    const { userInfo } = useOutletContext();

    // Read activeTab from URL query (for mobile bottom nav)
    const params = new URLSearchParams(search);
    const activeTab = parseInt(params.get('activeTab') || '0');

    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [constructions, setConstructions] = useState([]);
    const [history, setHistory] = useState([]);
    const [historyDateFilter, setHistoryDateFilter] = useState(null);
    const [historyConstructionFilter, setHistoryConstructionFilter] = useState([]);
    const [userOrgId, setUserOrgId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const userRole = localStorage.getItem('role') || 'employee';
    const isEmployee = userRole === 'employee' || userRole === 'technician';
    const basePath = isEmployee ? '/company' : '/admin';

    useEffect(() => {
        if (userInfo?.org_id) {
            setUserOrgId(userInfo.org_id);
        }
    }, [userInfo]);

    const loadConstructions = async () => {
        if (!userOrgId) return;
        setLoading(true);
        try {
            const res = await emergencyConstructionApi.getAll({ org_id: userOrgId, per_page: 100 });
            if (res.data?.status === 'success') {
                setConstructions(res.data.data?.data || []);
            }
        } catch (err) {
            toast.error('Lỗi tải danh sách công trình');
        } finally {
            setLoading(false);
        }
    };

    const loadAllHistory = async () => {
        if (!userOrgId) return;
        setHistoryLoading(true);
        try {
            const allHistory = [];
            for (const c of constructions) {
                const res = await emergencyConstructionApi.getProgressHistory(c.id);
                if (res.data?.status === 'success' && res.data.data) {
                    allHistory.push(...res.data.data.map(h => ({ ...h, construction_name: c.name })));
                }
            }
            allHistory.sort((a, b) => b.report_date - a.report_date);
            setHistory(allHistory);
        } catch (err) {
            console.error('Lỗi tải lịch sử chung', err);
        } finally {
            setHistoryLoading(false);
        }
    };

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


    useEffect(() => {
        if (userOrgId) loadConstructions();
    }, [userOrgId]);

    useEffect(() => {
        if (activeTab === 2 && constructions.length > 0) {
            loadAllHistory();
        }
    }, [activeTab, constructions]);

    const getStatusChip = (status) => {
        const config = {
            planned: { label: 'Dự kiến', color: 'default' },
            ongoing: { label: 'Đang thi công', color: 'warning' },
            completed: { label: 'Hoàn thành', color: 'success' },
            suspended: { label: 'Tạm dừng', color: 'error' }
        };
        const s = config[status] || config.planned;
        return <Chip label={s.label} color={s.color} size="small" variant="outlined" sx={{ fontWeight: 600 }} />;
    };

    const filteredConstructions = useMemo(() => {
        let result = activeTab === 1 ? constructions.filter(c => c.status !== 'completed') : constructions;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c => c.name?.toLowerCase().includes(q) || c.location?.toLowerCase().includes(q));
        }
        return result;
    }, [constructions, activeTab, searchQuery]);

    const stats = useMemo(() => {
        const total = constructions.length;
        const ongoing = constructions.filter(c => c.status !== 'completed').length;
        return { total, ongoing };
    }, [constructions]);

    const handleCardClick = (row) => {
        navigate(`${basePath}/emergency-construction/form?id=${row.id}&name=${encodeURIComponent(row.name)}`);
    };

    const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('role'); navigate('/pages/login'); };

    // ─── Render Logic ─────────────────────────────────────────────────────────

    return (
        <>
            {/* Tab 3: Account */}
            {activeTab === 3 && (
                <Box sx={{ px: 2, pt: 4, textAlign: 'center' }}>
                    <Avatar sx={{ width: 96, height: 96, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                        <IconUser size={48} />
                    </Avatar>
                    <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>{userInfo?.name || 'Cán bộ kỹ thuật'}</Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>{userInfo?.email || 'Phòng Thoát Nước Hà Nội'}</Typography>

                    <List sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', mb: 4, overflow: 'hidden' }}>
                        <ListItem button onClick={handleLogout} sx={{ color: 'error.main', py: 1.5 }}>
                            <ListItemIcon><IconLogout size={26} color={theme.palette.error.main} /></ListItemIcon>
                            <ListItemText primary="Đăng xuất" primaryTypographyProps={{ fontSize: '1.05rem', fontWeight: 600 }} />
                            <IconChevronRight size={24} style={{ color: theme.palette.text.disabled }} />
                        </ListItem>
                    </List>
                </Box>
            )}

            {/* Tab 2: Global History */}
            {activeTab === 2 && (
                <Box sx={{ px: isMobile ? 2 : 3, pt: 3, pb: 8 }}>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.dark', mb: 3 }}>Lịch sử báo cáo toàn hệ thống</Typography>

                    <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center', bgcolor: 'grey.50', p: 2, borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                            <DatePicker
                                label="Chọn ngày" value={historyDateFilter} onChange={(v) => { setHistoryDateFilter(v); setPage(0); }}
                                format="DD/MM/YYYY"
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        sx: { minWidth: 180, bgcolor: 'background.paper', borderRadius: 2 }
                                    }
                                }}
                            />
                        </LocalizationProvider>

                        <Autocomplete
                            multiple
                            size="small"
                            options={constructions}
                            disableCloseOnSelect
                            getOptionLabel={(option) => option.name}
                            value={constructions.filter(c => historyConstructionFilter.includes(c.id))}
                            onChange={(_, newValue) => { setHistoryConstructionFilter(newValue.map(v => v.id)); setPage(0); }}
                            renderInput={(params) => (
                                <TextField {...params} label="Chọn công trình" placeholder="Tìm kiếm..." sx={{ minWidth: 300, bgcolor: 'background.paper', borderRadius: 2 }} />
                            )}
                            renderOption={(props, option, { selected }) => (
                                <li {...props}>
                                    <Checkbox
                                        icon={<IconSquare size={20} />}
                                        checkedIcon={<IconCheckbox size={20} />}
                                        style={{ marginRight: 8 }}
                                        checked={selected}
                                    />
                                    <Typography variant="body2">{option.name}</Typography>
                                </li>
                            )}
                            sx={{
                                flex: 1, minWidth: 250,
                                '& .MuiOutlinedInput-root': { borderRadius: 2 }
                            }}
                        />

                        {(historyDateFilter || historyConstructionFilter.length > 0) && (
                            <Button size="small" color="error" startIcon={<IconX size={16} />} onClick={() => { setHistoryDateFilter(null); setHistoryConstructionFilter([]); setPage(0); }}>
                                Xóa bộ lọc
                            </Button>
                        )}
                    </Box>

                    {historyLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                    ) : (history.length === 0) ? (
                        <Typography color="textSecondary" align="center" sx={{ py: 4, fontStyle: 'italic' }}>Chưa có báo cáo nào được ghi nhận.</Typography>
                    ) : !isEmployee ? (
                        /* Admin View: Table based */
                        <Box>
                            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                                        <TableRow>
                                            <TableCell sx={{ width: 40 }} />
                                            <TableCell sx={{ fontWeight: 800 }}>Tên công trình</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Lệnh / Lần báo cáo</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Người báo cáo</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Ngày báo cáo</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Ghi chú công việc</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, width: 150 }}>Thao tác</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {history
                                            .filter(h =>
                                                (historyConstructionFilter.length === 0 || historyConstructionFilter.includes(h.construction_id)) &&
                                                (!historyDateFilter || (h.report_date >= historyDateFilter.startOf('day').unix() && h.report_date <= historyDateFilter.endOf('day').unix()))
                                            )
                                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                            .map((h, idx) => (
                                                <CollapsibleProgressRow
                                                    key={idx} h={h} isMobile={isMobile}
                                                    handleOpenViewer={handleOpenViewer} theme={theme}
                                                />
                                            ))
                                        }
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    rowsPerPageOptions={[10, 25, 50]}
                                    component="div"
                                    count={history.filter(h =>
                                        (historyConstructionFilter.length === 0 || historyConstructionFilter.includes(h.construction_id)) &&
                                        (!historyDateFilter || (h.report_date >= historyDateFilter.startOf('day').unix() && h.report_date <= historyDateFilter.endOf('day').unix()))
                                    ).length}
                                    rowsPerPage={rowsPerPage}
                                    page={page}
                                    onPageChange={(_, newPage) => setPage(newPage)}
                                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                                    labelRowsPerPage="Dòng mỗi trang:"
                                />
                            </TableContainer>
                        </Box>
                    ) : (
                        /* Employee View: Timeline based */
                        <Box sx={{ px: 1 }}>
                            {history.filter(h =>
                                (historyConstructionFilter.length === 0 || historyConstructionFilter.includes(h.construction_id)) &&
                                (!historyDateFilter || (h.report_date >= historyDateFilter.startOf('day').unix() && h.report_date <= historyDateFilter.endOf('day').unix()))
                            ).map((h, idx, array) => (
                                <Box key={idx} sx={{ display: 'flex', gap: isMobile ? 1.5 : 2, position: 'relative' }}>
                                    {idx < array.length - 1 && (
                                        <Box sx={{ position: 'absolute', left: 11, top: 32, width: 2, height: 'calc(100% - 20px)', bgcolor: 'grey.200' }} />
                                    )}
                                    <Box sx={{
                                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0, zIndex: 1, mt: 1,
                                        bgcolor: idx === 0 ? 'secondary.main' : 'grey.300',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '4px solid white', boxShadow: '0 0 0 1px #eee'
                                    }}>
                                        <IconRefresh size={10} />
                                    </Box>
                                    <Box sx={{ pb: 4, flex: 1, minWidth: 0 }}>
                                        <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} sx={{ mb: 1 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>{h.construction_name}</Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', opacity: 0.9 }}>{h.order || `Báo cáo ${dayjs(h.report_date * 1000).format('DD/MM')}`}</Typography>
                                            </Box>
                                            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600, opacity: 0.8, mt: isMobile ? 0.5 : 0 }}>
                                                {dayjs(h.report_date * 1000).format('DD/MM/YYYY • HH:mm')}
                                            </Typography>
                                        </Stack>

                                        <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.6 }}>{h.work_done}</Typography>

                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.5 }}>
                                            {h.location && (
                                                <Box sx={{ px: 1.2, py: 0.5, bgcolor: 'grey.50', borderRadius: 100, border: '1px solid', borderColor: 'grey.200', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <IconMapPin size={14} color={theme.palette.text.secondary} />
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{h.location}</Typography>
                                                </Box>
                                            )}
                                            {h.reporter_name && (
                                                <Box sx={{ px: 1.2, py: 0.5, bgcolor: 'secondary.lighter', borderRadius: 100, border: '1px solid', borderColor: 'secondary.light', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <IconUser size={14} color={theme.palette.secondary.main} />
                                                    <Typography variant="caption" sx={{ color: 'secondary.dark', fontWeight: 700 }}>{h.reporter_name}</Typography>
                                                </Box>
                                            )}
                                        </Box>

                                        {h.conclusion && (
                                            <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                                                <Typography variant="caption" color="primary.dark" fontWeight={900} display="block" sx={{ mb: 0.5 }}>KẾT LUẬN:</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{h.conclusion}</Typography>
                                            </Box>
                                        )}

                                        {h.issues && (
                                            <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'error.lighter', borderRadius: 2, borderLeft: '4px solid', borderColor: 'error.main' }}>
                                                <Typography variant="caption" color="error.dark" fontWeight={900} display="block" sx={{ mb: 0.5 }}>VƯỚNG MẮC:</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{h.issues}</Typography>
                                            </Box>
                                        )}

                                        {h.images && h.images.length > 0 && (
                                            <Box sx={{ display: 'flex', gap: 1.2, mt: 1, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 4 } }}>
                                                {h.images.map((img, iidx) => (
                                                    <Box
                                                        key={iidx} component="img" src={getInundationImageUrl(img)}
                                                        onClick={(e) => { e.stopPropagation(); handleOpenViewer(h.images, iidx); }}
                                                        sx={{ width: 100, height: 100, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'zoom-in', transition: 'transform .2s', flexShrink: 0, '&:hover': { transform: 'scale(1.02)' } }}
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            )}

            {/* Tab 0 & 1: Dashboard (All & Ongoing) */}
            {(activeTab === 0 || activeTab === 1) && (
                <Box sx={{ px: isMobile ? 2 : 0, pt: isMobile ? 2 : 0 }}>
                    {/* Header */}
                    {isMobile ? (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main', mb: 1.5 }}>Công trình khẩn</Typography>
                            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                                <Chip label={`Tất cả (${stats.total})`} size="small" variant={activeTab === 0 ? 'filled' : 'outlined'} color="primary" onClick={() => navigate(`${basePath}/emergency-construction/dashboard`)} sx={{ fontWeight: 700, height: 34, fontSize: '1rem', cursor: 'pointer' }} />
                                <Chip label={`Chưa xong (${stats.ongoing})`} size="small" color="warning" variant={activeTab === 1 ? 'filled' : 'outlined'} onClick={() => navigate(`${basePath}/emergency-construction/dashboard?activeTab=1`)} sx={{ fontWeight: 700, height: 34, fontSize: '1rem', cursor: 'pointer' }} />
                            </Stack>
                            <TextField
                                fullWidth size="small" placeholder="Tìm kiếm công trình..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{ mb: 2, bgcolor: 'background.paper', borderRadius: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                InputProps={{
                                    startAdornment: <IconSearch size={16} sx={{ color: 'text.disabled', mr: 1, fontSize: '1.1rem' }} />,
                                    endAdornment: searchQuery ? <IconButton size="small" onClick={() => setSearchQuery('')}><IconX size={16} /></IconButton> : null
                                }}
                            />
                        </Box>
                    ) : (
                        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.dark', mb: 1.5 }}>Quản lý công trình khẩn cấp</Typography>
                                <Stack direction="row" spacing={1.5}>
                                    <Chip label={`Tất cả (${stats.total})`} size="small" variant={activeTab === 0 ? 'filled' : 'outlined'} color="primary" onClick={() => navigate(`${basePath}/emergency-construction/dashboard`)} sx={{ fontWeight: 700, px: 1, cursor: 'pointer' }} />
                                    <Chip label={`Chưa xong (${stats.ongoing})`} size="small" color="warning" variant={activeTab === 1 ? 'filled' : 'outlined'} onClick={() => navigate(`${basePath}/emergency-construction/dashboard?activeTab=1`)} sx={{ fontWeight: 700, px: 1, cursor: 'pointer' }} />
                                </Stack>
                            </Box>
                            <Box sx={{ width: 350 }}>
                                <TextField
                                    fullWidth size="small" placeholder="Tìm kiếm công trình..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    sx={{ bgcolor: 'background.paper', borderRadius: 2, '& .MuiOutlinedInput-root': { borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' } }}
                                    InputProps={{
                                        startAdornment: <IconSearch size={16} sx={{ color: 'text.disabled', mr: 1, fontSize: '1.1rem' }} />,
                                        endAdornment: searchQuery ? <IconButton size="small" onClick={() => setSearchQuery('')}><IconX size={16} /></IconButton> : null
                                    }}
                                />
                            </Box>
                        </Box>
                    )}

                    {/* List */}
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={30} color="secondary" /></Box>
                    ) : filteredConstructions.length === 0 ? (
                        <Typography align="center" sx={{ py: 3, color: 'text.secondary' }}>Không có công trình nào phù hợp</Typography>
                    ) : isMobile ? (
                        <Stack spacing={2}>
                            {filteredConstructions.map((row) => (
                                <Card key={row.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', cursor: 'pointer', transition: 'all .2s', '&:hover': { borderColor: 'primary.main' } }} onClick={() => handleCardClick(row)}>
                                    <CardContent sx={{ p: '16px !important' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'flex-start' }}>
                                            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.3, pr: 1, fontSize: '1.2rem' }}>{row.name}</Typography>
                                            {getStatusChip(row.status)}
                                        </Box>
                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1, fontSize: '1rem' }}>📍 {row.location}</Typography>
                                        <Typography variant="body2" display="block" color="textSecondary" sx={{ mb: 2, fontSize: '0.95rem' }}>📅 Dự kiến: {new Date(row.end_date * 1000).toLocaleDateString('vi-VN')}</Typography>
                                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, display: 'flex', alignItems: 'center', fontSize: '1rem' }}>Chạm để báo cáo / xem lịch sử <IconChevronRight size={16} /></Typography>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    ) : (
                        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                            <Table sx={{ minWidth: 700 }}>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', py: 2 }}>Tên công trình</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', py: 2 }}>Vị trí</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', py: 2 }}>Nhà thầu thi công</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', py: 2 }}>Trạng thái</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', py: 2 }}>Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredConstructions.map((row) => (
                                        <TableRow key={row.id} hover onClick={() => handleCardClick(row)} sx={{ cursor: 'pointer', transition: 'background-color 0.2s', '&:hover': { bgcolor: 'primary.lighter' } }}>
                                            <TableCell>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.dark' }}>{row.name}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    📍 {row.location}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.dark' }}>{row.organization_name}</Typography>
                                            </TableCell>
                                            <TableCell>{getStatusChip(row.status)}</TableCell>
                                            <TableCell align="right">
                                                <Button size="small" variant="contained" color="secondary" endIcon={<IconChevronRight size={16} />} sx={{ borderRadius: '8px', boxShadow: 'none', fontWeight: 700, px: 2, bgcolor: 'secondary.light', color: 'secondary.dark', '&:hover': { bgcolor: 'secondary.main', color: '#fff' } }}>
                                                    Chi tiết
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            )}

            {/* Image Slider / Lightbox */}
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

                    <Box
                        component="img"
                        src={getInundationImageUrl(viewer.images[viewer.index])}
                        sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
                    />

                    <Box sx={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
                        <Typography sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.5)', display: 'inline-block', px: 2, py: 0.5, borderRadius: 10, fontSize: '0.85rem' }}>
                            {viewer.index + 1} / {viewer.images.length}
                        </Typography>
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ConstructionReporting;
