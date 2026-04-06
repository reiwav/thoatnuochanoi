import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button, Grid, TextField, Table, TableBody, Stack,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, TablePagination, Typography, Chip, Tooltip,
    Collapse, Box, useTheme, useMediaQuery
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconSearch, IconUsers, IconChevronDown, IconChevronUp, IconClipboardCheck } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import stationApi from 'api/station';
import { IconCloudRain, IconRipple, IconDroplet, IconAlertTriangle } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import organizationApi from 'api/organization';
import OrganizationDialog from './OrganizationDialog';
import useAuthStore from 'store/useAuthStore';

const OrgRow = ({ row, handleManageUsers, handleOpenEdit, handleDelete, totals, isMobile, hasPermission }) => {
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
                {!isMobile && <TableCell>{row.code}</TableCell>}
                {!isMobile && (
                    <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <IconClipboardCheck size={16} style={{ color: '#64748b' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.order || '-'}</Typography>
                        </Stack>
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.phone_number}</Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>{row.email}</Typography>
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Tooltip title={`Trạm mưa: ${row.rain_station_ids?.length || 0}/${totals.rain}`}>
                                <Chip icon={<IconCloudRain size={14} />} label={row.rain_station_ids?.length || 0} size="small" variant="outlined" color="primary" />
                            </Tooltip>
                            <Tooltip title={`Mực nước hồ: ${row.lake_station_ids?.length || 0}/${totals.lake}`}>
                                <Chip icon={<IconRipple size={14} />} label={row.lake_station_ids?.length || 0} size="small" variant="outlined" color="info" />
                            </Tooltip>
                            <Tooltip title={`Mực nước sông: ${row.river_station_ids?.length || 0}/${totals.river}`}>
                                <Chip icon={<IconDroplet size={14} />} label={row.river_station_ids?.length || 0} size="small" variant="outlined" color="secondary" />
                            </Tooltip>
                            <Tooltip title={`Điểm ngập: ${row.inundation_ids?.length || 0}/${totals.inundation}`}>
                                <Chip icon={<IconAlertTriangle size={14} />} label={row.inundation_ids?.length || 0} size="small" variant="outlined" color="warning" />
                            </Tooltip>
                        </Stack>
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell>
                        <Chip label={row.status ? 'Hoạt động' : 'Ngừng hoạt động'} color={row.status ? 'success' : 'default'} size="small" variant="outlined" />
                    </TableCell>
                )}
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {hasPermission('employee:view') && (
                        <Tooltip title="Quản lý người dùng">
                            <IconButton color="secondary" size="small" onClick={() => handleManageUsers(row)}>
                                <IconUsers size={20} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {hasPermission('organization:edit') && (
                        <Tooltip title="Chỉnh sửa">
                            <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                                <IconEdit size={20} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {hasPermission('organization:delete') && (
                        <Tooltip title="Xóa">
                            <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                                <IconTrash size={20} />
                            </IconButton>
                        </Tooltip>
                    )}
                </TableCell>
            </TableRow>
            {isMobile && (
                <TableRow>
                    <TableCell style={{ padding: 0 }} colSpan={3}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 0, backgroundColor: 'grey.50', p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom component="div" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                    Chi tiết đơn vị
                                </Typography>
                                <Table size="small" aria-label="details">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, width: '40%', borderBottom: 'none' }}>Mã</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>{row.code}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Lệnh số</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>{row.order || '-'}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Liên hệ</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>
                                                <Typography variant="body2">{row.phone_number}</Typography>
                                                <Typography variant="caption" color="textSecondary">{row.email}</Typography>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Trạm được gán</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>
                                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                                                    <Tooltip title={`Trạm mưa: ${row.rain_station_ids?.length || 0}/${totals.rain}`}>
                                                        <Chip icon={<IconCloudRain size={14} />} label={row.rain_station_ids?.length || 0} size="small" variant="outlined" color="primary" />
                                                    </Tooltip>
                                                    <Tooltip title={`Mực nước hồ: ${row.lake_station_ids?.length || 0}/${totals.lake}`}>
                                                        <Chip icon={<IconRipple size={14} />} label={row.lake_station_ids?.length || 0} size="small" variant="outlined" color="info" />
                                                    </Tooltip>
                                                    <Tooltip title={`Mực nước sông: ${row.river_station_ids?.length || 0}/${totals.river}`}>
                                                        <Chip icon={<IconDroplet size={14} />} label={row.river_station_ids?.length || 0} size="small" variant="outlined" color="secondary" />
                                                    </Tooltip>
                                                    <Tooltip title={`Điểm ngập: ${row.inundation_ids?.length || 0}/${totals.inundation}`}>
                                                        <Chip icon={<IconAlertTriangle size={14} />} label={row.inundation_ids?.length || 0} size="small" variant="outlined" color="warning" />
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Trạng thái</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>
                                                <Chip label={row.status ? 'Hoạt động' : 'Ngừng hoạt động'} color={row.status ? 'success' : 'default'} size="small" variant="outlined" />
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow >
            )}
        </>
    );
};


const OrganizationList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const { hasPermission } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [organizations, setOrganizations] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [filterInputs, setFilterInputs] = useState({ name: '', code: '' });
    const [params, setParams] = useState({ name: '', code: '' });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState(null);
    const [totals, setTotals] = useState({ rain: 0, lake: 0, river: 0, inundation: 0 });

    const fetchTotals = async () => {
        try {
            const [rainRes, lakeRes, riverRes, inundationRes] = await Promise.all([
                stationApi.rain.getAll({ per_page: 1 }),
                stationApi.lake.getAll({ per_page: 1 }),
                stationApi.river.getAll({ per_page: 1 }),
                stationApi.inundation.getAll()
            ]);

            setTotals({
                rain: rainRes.data?.data?.total || 0,
                lake: lakeRes.data?.data?.total || 0,
                river: riverRes.data?.data?.total || 0,
                inundation: inundationRes.data?.total || inundationRes.data?.length || 0
            });
        } catch (err) {
            console.error('Lỗi tải tổng số trạm:', err);
        }
    };

    const loadOrganizations = async () => {
        setLoading(true);
        try {
            const res = await organizationApi.getAll({ ...params, page: page + 1, per_page: rowsPerPage });
            if (res.data?.status === 'success') {
                const result = res.data.data;
                setOrganizations(Array.isArray(result.data) ? result.data : []);
                setTotalItems(result.total || 0);
            } else {
                setOrganizations([]);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách công ty:', err);
            setOrganizations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrganizations();
        fetchTotals();
    }, [page, rowsPerPage, params]);

    const handleSearch = () => { setPage(0); setParams(filterInputs); };
    const handleOpenCreate = () => { setEditingOrg(null); setDialogOpen(true); };
    const handleOpenEdit = (org) => { setEditingOrg(org); setDialogOpen(true); };
    const handleManageUsers = (org) => {
        navigate(`/admin/employee?org_id=${org.id}&org_name=${encodeURIComponent(org.name)}`);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa công ty này?')) return;
        try {
            const res = await organizationApi.delete(id);
            if (res.data?.status === 'success') { toast.success('Xóa thành công'); loadOrganizations(); }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa công ty');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const res = editingOrg
                ? await organizationApi.update(editingOrg.id, values)
                : await organizationApi.create(values);
            if (res.data?.status === 'success') {
                toast.success(editingOrg ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadOrganizations();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    return (
        <MainCard
            title="Quản lý đơn vị"
            secondary={
                hasPermission('organization:create') && (
                    <AnimateButton>
                        <Button variant="contained" color="secondary" startIcon={<IconPlus size={18} />} onClick={handleOpenCreate}>
                            Thêm đơn vị
                        </Button>
                    </AnimateButton>
                )
            }
        >
            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Tên đơn vị" value={filterInputs.name}
                        onChange={(e) => setFilterInputs({ ...filterInputs, name: e.target.value })}
                        size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Mã công ty" value={filterInputs.code}
                        onChange={(e) => setFilterInputs({ ...filterInputs, code: e.target.value })}
                        size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                </Grid>
                <Grid item xs={12} sm={2}>
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
                            <TableCell sx={{ fontWeight: 700 }}>Tên đơn vị</TableCell>
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Mã</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Lệnh số</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Thông tin liên hệ</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Trạm được gán</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>}
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={isMobile ? 3 : 7} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : organizations.length === 0 ? (
                            <TableRow><TableCell colSpan={isMobile ? 3 : 7} align="center" sx={{ py: 3 }}>Không tìm thấy công ty</TableCell></TableRow>
                        ) : (
                            organizations.map((row) => (
                                <OrgRow
                                    key={row.id}
                                    row={row}
                                    handleManageUsers={handleManageUsers}
                                    handleOpenEdit={handleOpenEdit}
                                    handleDelete={handleDelete}
                                    totals={totals}
                                    isMobile={isMobile}
                                    hasPermission={hasPermission}
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

            <OrganizationDialog
                open={dialogOpen} onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit} organization={editingOrg} isEdit={!!editingOrg}
            />
        </MainCard>
    );
};

export default OrganizationList;
