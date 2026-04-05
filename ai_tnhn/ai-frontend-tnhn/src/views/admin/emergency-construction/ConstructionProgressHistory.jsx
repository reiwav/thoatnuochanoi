import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, Stack, TextField, MenuItem,
    CircularProgress, Button, TablePagination,
    IconButton, Collapse, useTheme, useMediaQuery, Grid, Autocomplete, Checkbox,
    Dialog, DialogContent
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import {
    IconSearch, IconAlertTriangle, IconX, IconChevronUp, IconChevronDown,
    IconMapPin, IconCalendar, IconUser, IconClipboardList, IconSquare, IconCheckbox,
    IconChevronLeft, IconChevronRight, IconEdit
} from '@tabler/icons-react';
import emergencyConstructionApi from 'api/emergencyConstruction';
import { getInundationImageUrl } from 'utils/imageHelper';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

const CollapsibleProgressRow = ({ row, handleOpenViewer, isMobile, userRole }) => {
    const [open, setOpen] = useState(true);
    const navigate = useNavigate();

    const handleEdit = (e) => {
        e.stopPropagation();
        navigate(`/admin/emergency-construction/form?id=${row.construction_id}&edit_id=${row.id}&name=${encodeURIComponent(row.construction_name || 'Báo cáo')}`);
    };

    const isAdmin = userRole === 'super_admin' || userRole === 'admin_org';

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
                <TableCell sx={{ width: 40, p: { xs: 1, md: 2 } }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, p: { xs: 1, md: 2 } }}>{row.construction_name}</TableCell>
                <TableCell>{row.order || '-'}</TableCell>
                <TableCell>{row.reporter_name || '-'}</TableCell>
                <TableCell>{dayjs(row.report_date * 1000).format('DD/MM/YYYY • HH:mm')}</TableCell>
                <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.work_done}
                </TableCell>
                <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {isAdmin && (
                            <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                startIcon={<IconEdit size={16} />}
                                onClick={handleEdit}
                                sx={{ borderRadius: 2 }}
                            >
                                Sửa
                            </Button>
                        )}
                        <Button
                            size="small"
                            variant="text"
                            onClick={() => setOpen(!open)}
                            endIcon={open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                        >
                            {open ? 'Thu gọn' : 'Chi tiết'}
                        </Button>
                    </Stack>
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
                                    <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>{row.work_done}</Typography>

                                    {row.location && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>VỊ TRÍ:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <IconMapPin size={16} /> {row.location}
                                            </Typography>
                                        </Box>
                                    )}
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    {row.conclusion && (
                                        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.lighter', borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                                            <Typography variant="caption" color="primary.dark" fontWeight={900} display="block" sx={{ mb: 0.5 }}>KẾT LUẬN:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.conclusion}</Typography>
                                        </Box>
                                    )}

                                    {row.issues && (
                                        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.lighter', borderRadius: 2, borderLeft: '4px solid', borderColor: 'error.main' }}>
                                            <Typography variant="caption" color="error.dark" fontWeight={900} display="block" sx={{ mb: 0.5 }}>VƯỚNG MẮC:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.issues}</Typography>
                                        </Box>
                                    )}
                                </Grid>

                                {row.images && row.images.length > 0 && (
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>HÌNH ẢNH HIỆN TRƯỜNG:</Typography>
                                        <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 4 } }}>
                                            {row.images.map((img, idx) => (
                                                <Box
                                                    key={idx} component="img" src={getInundationImageUrl(img)}
                                                    onClick={(e) => { e.stopPropagation(); handleOpenViewer(row.images, idx); }}
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

const ConstructionProgressHistory = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    
    // Get auth state from Zustand
    const { role: userRole } = useAuthStore();

    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState([]);
    const [constructions, setConstructions] = useState([]);
    const [totalReports, setTotalReports] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Filters
    const [dateFilter, setDateFilter] = useState(null);
    const [constructionFilter, setConstructionFilter] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });

    const fetchConstructions = async () => {
        try {
            const res = await emergencyConstructionApi.getAll({ per_page: 1000 });
            if (res.data?.status === 'success') {
                setConstructions(res.data.data?.data || []);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách công trình:', err);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const params = {
                page: page + 1,
                per_page: rowsPerPage,
                query: searchQuery
            };

            if (dateFilter) {
                params.date = dateFilter.format('YYYY-MM-DD');
            }

            if (constructionFilter.length > 0) {
                params.construction_ids = constructionFilter.join(',');
            }

            const res = await emergencyConstructionApi.getGlobalHistory(params);
            if (res.data?.status === 'success') {
                setReports(res.data.data?.data || []);
                setTotalReports(res.data.data?.total || 0);
            }
        } catch (err) {
            toast.error('Lỗi tải lịch sử báo cáo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConstructions();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [page, rowsPerPage, dateFilter, constructionFilter]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setPage(0);
            fetchReports();
        }
    };

    const handleOpenViewer = (images, index = 0) => {
        setViewer({ open: true, images, index });
    };

    const handleCloseViewer = () => setViewer({ ...viewer, open: false });

    return (
        <MainCard
            title={
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconClipboardList size={24} color={theme.palette.primary.main} />
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>Lịch sử báo cáo thi công</Typography>
                </Stack>
            }
        >
            <Box sx={{ mb: 4 }}>
                <Grid container spacing={2} alignItems="flex-start">
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Tìm kiếm nội dung..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearch}
                            InputProps={{
                                startAdornment: <IconSearch size={18} style={{ marginRight: 8, color: theme.palette.text.disabled }} />,
                                endAdornment: searchQuery && (
                                    <IconButton size="small" onClick={() => { setSearchQuery(''); setPage(0); }}>
                                        <IconX size={16} />
                                    </IconButton>
                                ),
                                sx: { borderRadius: 2 }
                            }}
                            sx={{ mt: 0.5 }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                            <Box sx={{ mt: 0.5 }}>
                                <DatePicker
                                    label="Chọn ngày"
                                    value={dateFilter}
                                    onChange={(val) => { setDateFilter(val); setPage(0); }}
                                    format="DD/MM/YYYY"
                                    slotProps={{
                                        textField: {
                                            size: 'small',
                                            fullWidth: true,
                                            sx: { bgcolor: 'background.paper', borderRadius: 2 }
                                        }
                                    }}
                                />
                            </Box>
                        </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Autocomplete
                                multiple
                                fullWidth
                                limitTags={2}
                                size="small"
                                options={constructions}
                                disableCloseOnSelect
                                getOptionLabel={(option) => option.name}
                                value={constructions.filter(c => constructionFilter.includes(c.id))}
                                onChange={(_, newValue) => { setConstructionFilter(newValue.map(v => v.id)); setPage(0); }}
                                renderInput={(params) => (
                                    <TextField {...params} label="Chọn công trình" placeholder="Tìm kiếm..." sx={{ bgcolor: 'background.paper', borderRadius: 2 }} />
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
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, flex: 1 }}
                            />
                            {(dateFilter || constructionFilter.length > 0 || searchQuery) && (
                                <Button
                                    size="medium"
                                    color="error"
                                    variant="outlined"
                                    startIcon={<IconX size={16} />}
                                    onClick={() => { setDateFilter(null); setConstructionFilter([]); setSearchQuery(''); setPage(0); }}
                                    sx={{ borderRadius: 2, height: 40, whiteSpace: 'nowrap', minWidth: 'fit-content' }}
                                >
                                    Xóa lọc
                                </Button>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress color="secondary" /></Box>
            ) : reports.length === 0 ? (
                <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 4, border: '1px dashed' }}>
                    <Typography color="textSecondary" variant="h4" sx={{ fontWeight: 600 }}>Chưa có báo cáo nào được ghi nhận.</Typography>
                </Box>
            ) : (
                <Box>
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'grey.50' }}>
                                <TableRow>
                                    <TableCell sx={{ width: 40 }} />
                                    <TableCell sx={{ fontWeight: 800 }}>Tên công trình</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Lệnh / Lần</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Người báo cáo</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Ngày báo cáo</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Ghi chú công việc</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 800, width: 200, alignItems: 'center' }}>Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reports.map((row) => (
                                    <CollapsibleProgressRow
                                        key={row.id}
                                        row={row}
                                        isMobile={isMobile}
                                        userRole={userRole}
                                        handleOpenViewer={handleOpenViewer}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                        <TablePagination
                            rowsPerPageOptions={[10, 25, 50]}
                            component="div"
                            count={totalReports}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={(_, newPage) => setPage(newPage)}
                            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                            labelRowsPerPage="Dòng mỗi trang:"
                        />
                    </TableContainer>
                </Box>
            )}

            {/* Image Viewer */}
            <Dialog open={viewer.open} onClose={handleCloseViewer} maxWidth="lg" PaperProps={{ sx: { bgcolor: 'black', borderRadius: 4, overflow: 'hidden', position: 'relative' } }}>
                <IconButton onClick={handleCloseViewer} sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
                    <IconX size={20} />
                </IconButton>

                <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', position: 'relative' }}>
                    {viewer.images.length > 1 && (
                        <>
                            <IconButton onClick={() => setViewer(v => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }))} sx={{ position: 'absolute', left: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}>
                                <IconChevronLeft size={32} />
                            </IconButton>
                            <IconButton onClick={() => setViewer(v => ({ ...v, index: (v.index + 1) % v.images.length }))} sx={{ position: 'absolute', right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}>
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
        </MainCard>
    );
};

export default ConstructionProgressHistory;
