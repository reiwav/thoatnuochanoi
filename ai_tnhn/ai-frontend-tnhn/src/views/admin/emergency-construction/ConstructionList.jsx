import { useState, useEffect } from 'react';
import {
    Box, Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, TablePagination, Typography, Chip, Tooltip, Stack,
    Collapse, useTheme, useMediaQuery
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconSearch, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import emergencyConstructionApi from 'api/emergencyConstruction';
import ConstructionDialog from './ConstructionDialog';
import organizationApi from 'api/organization';

const ConstructionRow = ({ row, handleOpenEdit, handleDelete, orgs, getStatusChip, isMobile, userRole }) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TableRow hover>
                {isMobile && (
                    <TableCell padding="checkbox">
                        <IconButton size="small" onClick={() => setOpen(!open)}>
                            {open ? <IconChevronUp /> : <IconChevronDown />}
                        </IconButton>
                    </TableCell>
                )}
                <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                {!isMobile && <TableCell>{row.location}</TableCell>}
                {!isMobile && (
                    <TableCell>
                        <Typography variant="body2">{new Date(row.start_date * 1000).toLocaleDateString('vi-VN')}</Typography>
                        <Typography variant="caption" color="textSecondary">Đến: {new Date(row.end_date * 1000).toLocaleDateString('vi-VN')}</Typography>
                    </TableCell>
                )}
                {!isMobile && userRole === 'super_admin' && <TableCell>{orgs[row.org_id] || row.org_id}</TableCell>}
                {!isMobile && <TableCell>{getStatusChip(row.status)}</TableCell>}
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Chỉnh sửa">
                        <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                            <IconEdit size={20} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa">
                        <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                            <IconTrash size={20} />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            </TableRow>
            {isMobile && (
                <TableRow>
                    <TableCell style={{ padding: 0 }} colSpan={3}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 0, backgroundColor: 'grey.50', p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom component="div" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                    Chi tiết công trình
                                </Typography>
                                <Table size="small" aria-label="details">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, width: '40%', borderBottom: 'none' }}>Vị trí</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>{row.location}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Thời gian</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>
                                                <Typography variant="body2">{new Date(row.start_date * 1000).toLocaleDateString('vi-VN')}</Typography>
                                                <Typography variant="caption" color="textSecondary">Đến: {new Date(row.end_date * 1000).toLocaleDateString('vi-VN')}</Typography>
                                            </TableCell>
                                        </TableRow>
                                        {userRole === 'super_admin' && (
                                            <TableRow>
                                                <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Đơn vị quản lý</TableCell>
                                                <TableCell sx={{ borderBottom: 'none' }}>{orgs[row.org_id] || row.org_id}</TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Trạng thái</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>{getStatusChip(row.status)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

const ConstructionList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const userRole = localStorage.getItem('role');
    const userOrgId = localStorage.getItem('org_id');
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [filterInputs, setFilterInputs] = useState({ name: '', status: '' });
    const [params, setParams] = useState({ name: '', status: '' });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [orgs, setOrgs] = useState({});

    const fetchOrgs = async () => {
        try {
            const res = await organizationApi.getAll({ per_page: 1000 });
            if (res.data?.status === 'success') {
                const orgMap = {};
                res.data.data?.data?.forEach(o => {
                    orgMap[o.id] = o.name;
                });
                setOrgs(orgMap);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách công ty:', err);
        }
    };

    const loadItems = async () => {
        setLoading(true);
        try {
            const res = await emergencyConstructionApi.getAll({ ...params, page: page + 1, per_page: rowsPerPage });
            if (res.data?.status === 'success') {
                setItems(res.data.data?.data || []);
                setTotalItems(res.data.data?.total || 0);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách công trình:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, []);

    useEffect(() => {
        loadItems();
    }, [page, rowsPerPage, params]);

    const handleSearch = () => { setPage(0); setParams(filterInputs); };
    const handleOpenCreate = () => { setEditingItem(null); setDialogOpen(true); };
    const handleOpenEdit = (item) => { setEditingItem(item); setDialogOpen(true); };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa công trình này?')) return;
        try {
            const res = await emergencyConstructionApi.delete(id);
            if (res.data?.status === 'success') { toast.success('Xóa thành công'); loadItems(); }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa công trình');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const res = editingItem
                ? await emergencyConstructionApi.update(editingItem.id, values)
                : await emergencyConstructionApi.create(values);
            if (res.data?.status === 'success') {
                toast.success(editingItem ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadItems();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    const getStatusChip = (status) => {
        const config = {
            planned: { label: 'Dự kiến', color: 'default' },
            ongoing: { label: 'Đang thi công', color: 'warning' },
            completed: { label: 'Hoàn thành', color: 'success' },
            suspended: { label: 'Tạm dừng', color: 'error' }
        };
        const s = config[status] || config.planned;
        return <Chip label={s.label} color={s.color} size="small" variant="outlined" />;
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                <Button variant="contained" color="secondary" startIcon={<IconPlus size={18} />} onClick={handleOpenCreate}>
                    Thêm công trình
                </Button>
            </Stack>

            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Grid item xs={12} sm={8} md={4}>
                    <TextField fullWidth label="Tên công trình" value={filterInputs.name}
                        onChange={(e) => setFilterInputs({ ...filterInputs, name: e.target.value })}
                        size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                </Grid>
                <Grid item xs={12} sm={4} md={3}>
                    <Button fullWidth variant="contained" color="primary" startIcon={<IconSearch size={20} />}
                        onClick={handleSearch} sx={{ borderRadius: '10px' }}>
                        Tìm kiếm
                    </Button>
                </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            {isMobile && <TableCell width="40px" />}
                            <TableCell sx={{ fontWeight: 700 }}>Tên công trình</TableCell>
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Vị trí</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>}
                            {!isMobile && userRole === 'super_admin' && <TableCell sx={{ fontWeight: 700 }}>Đơn vị quản lý</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>}
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={isMobile ? 3 : 7} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={isMobile ? 3 : 7} align="center" sx={{ py: 3 }}>Không tìm thấy công trình</TableCell></TableRow>
                        ) : (
                            items.map((row) => (
                                <ConstructionRow
                                    key={row.id}
                                    row={row}
                                    handleOpenEdit={handleOpenEdit}
                                    handleDelete={handleDelete}
                                    orgs={orgs}
                                    getStatusChip={getStatusChip}
                                    isMobile={isMobile}
                                    userRole={userRole}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]} component="div" count={totalItems}
                    rowsPerPage={rowsPerPage} page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    labelRowsPerPage="Số dòng:"
                />
            </TableContainer>

            <ConstructionDialog
                open={dialogOpen} onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit} item={editingItem} isEdit={!!editingItem}
                userRole={userRole} defaultOrgId={userOrgId}
            />
        </Box>
    );
};

export default ConstructionList;
