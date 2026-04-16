import { useState, useEffect } from 'react';
import { } from 'react-router-dom';
import {
    Button, Grid, TextField, Table, TableBody, Box, Stack,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, TablePagination, Typography, Chip, Tooltip,
    Collapse, useTheme, useMediaQuery
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconSearch, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import stationApi from 'api/station';
import organizationApi from 'api/organization';
import StationDialog from './StationDialog';
import useAuthStore from 'store/useAuthStore';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';

const StationRow = ({ row, handleOpenEdit, handleDelete, isMobile, canEdit, canDelete, organizationName, organizationNames }) => {
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
                <TableCell sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'primary.dark' }}>{row.TenTram}</TableCell>
                {!isMobile && <TableCell sx={{ fontSize: '0.95rem' }}>{row.DiaChi}</TableCell>}
                {!isMobile && (
                    <TableCell sx={{ fontSize: '0.95rem' }}>
                        {row.Loai ? (
                            <Chip
                                label={row.Loai === 'phuong' ? 'Phường' : (row.Loai === 'xa' ? 'Xã' : 'Thị trấn')}
                                color={row.Loai === 'phuong' ? 'primary' : (row.Loai === 'xa' ? 'secondary' : 'info')}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 700, borderRadius: '6px' }}
                            />
                        ) : '-'}
                    </TableCell>
                )}
                <TableCell sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{organizationName || '-'}</TableCell>
                {!isMobile && <TableCell sx={{ fontSize: '0.85rem' }}>{row.share_all ? 'Tất cả xí nghiệp' : (row.shared_org_ids?.map(id => organizationNames[id]).filter(n => n).join(', ') || '-')}</TableCell>}
                {!isMobile && <TableCell align="center" sx={{ fontSize: '1rem', fontWeight: 700 }}>{row.ThuTu || 0}</TableCell>}
                {!isMobile && <TableCell align="center" sx={{ fontSize: '1rem', fontWeight: 700 }}>{row.TrongSoBaoCao || 0}</TableCell>}
                {!isMobile && <TableCell sx={{ fontSize: '1rem', fontWeight: 700 }}>{row.NguongCanhBao || '-'}</TableCell>}
                {!isMobile && (
                    <TableCell>
                        <Chip label={row.Active ? 'Hoạt động' : 'Ngừng'} color={row.Active ? 'success' : 'default'} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem', height: 24 }} />
                    </TableCell>
                )}
                {(canEdit || canDelete) && (
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {canEdit && (
                            <Tooltip title="Chỉnh sửa">
                                <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                                    <IconEdit size={20} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {canDelete && (
                            <Tooltip title="Xóa">
                                <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                                    <IconTrash size={20} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </TableCell>
                )}
            </TableRow>
            {isMobile && (
                <TableRow>
                    <TableCell style={{ padding: 0 }} colSpan={3}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 0, backgroundColor: 'grey.50', p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom component="div" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                    Chi tiết trạm
                                </Typography>
                                <Table size="small" aria-label="details">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, width: '40%', borderBottom: 'none' }}>Đơn vị quản lý</TableCell>
                                            <TableCell sx={{ borderBottom: 'none', color: 'secondary.main', fontWeight: 700 }}>{organizationName || '-'}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, width: '40%', borderBottom: 'none' }}>Địa chỉ</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>{row.DiaChi}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Tọa độ</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>{row.Lat}, {row.Lng}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Ngưỡng</TableCell>
                                            <TableCell sx={{ borderBottom: 'none', fontWeight: 700 }}>{row.NguongCanhBao || '-'}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Trạng thái</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>
                                                <Chip label={row.Active ? 'Hoạt động' : 'Ngừng'} color={row.Active ? 'success' : 'default'} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem', height: 24 }} />
                                            </TableCell>
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

const StationRainList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user, isCompany, hasPermission } = useAuthStore();
    const canCreate = hasPermission('rain:create');
    const canEdit = hasPermission('rain:edit');
    const canDelete = hasPermission('rain:delete');

    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [organizations, setOrganizations] = useState({ primary: [], shared: [] });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [filterInputs, setFilterInputs] = useState({ search: '', active: '', org_id: '' });
    const [params, setParams] = useState({ search: '', active: '', org_id: '' });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStation, setEditingStation] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [stRes, orgRes] = await Promise.all([
                stationApi.rain.getAll({ ...params, page: page + 1, per_page: rowsPerPage }),
                organizationApi.getSelectionList()
            ]);

            if (stRes.data?.status === 'success') {
                const result = stRes.data.data;
                setStations(Array.isArray(result.data) ? result.data : []);
                setTotalItems(result.total || 0);
            }

            if (orgRes.data?.status === 'success') {
                setOrganizations(orgRes.data.data || { primary: [], shared: [] });
            }
        } catch (err) {
            console.error('Lỗi tải dữ liệu:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [page, rowsPerPage, params]);

    const handleSearch = () => { setPage(0); setParams(filterInputs); };
    const handleOpenCreate = () => { setEditingStation(null); setDialogOpen(true); };
    const handleOpenEdit = (station) => { setEditingStation(station); setDialogOpen(true); };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa trạm này?')) return;
        try {
            const res = await stationApi.rain.delete(id);
            if (res.data?.status === 'success') { toast.success('Xóa thành công'); loadData(); }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa trạm');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const payload = { ...values };
            const res = editingStation
                ? await stationApi.rain.update(editingStation.id, values)
                : await stationApi.rain.create(values);
            if (res.data?.status === 'success') {
                toast.success(editingStation ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadData();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    const getOrgName = (orgId) => {
        const org = organizations.shared?.find(o => o.id === orgId);
        return org ? org.name : '';
    };

    const organizationNamesMap = (organizations.shared || []).reduce((acc, org) => {
        acc[org.id] = org.name;
        return acc;
    }, {});

    return (
        <MainCard
            title="Quản lý trạm đo mưa"
            secondary={canCreate && (
                <AnimateButton>
                    <Button variant="contained" color="secondary" startIcon={<IconPlus size={20} />} onClick={handleOpenCreate} sx={{ borderRadius: 3, fontWeight: 700, fontSize: '1rem', px: 2, py: 1 }}>
                        Thêm trạm mới
                    </Button>
                </AnimateButton>
            )}
        >
            <Box sx={{ mb: 3 }}>
                <Stack direction={isMobile ? "column" : "row"} spacing={1.5} alignItems="center">
                    <TextField fullWidth label="Tìm theo tên trạm" value={filterInputs.search}
                        onChange={(e) => setFilterInputs({ ...filterInputs, search: e.target.value })}
                        size="small"
                        InputProps={{ sx: { borderRadius: 3 } }}
                        sx={{ flex: 1 }}
                    />

                    <OrganizationSelect
                        value={filterInputs.org_id}
                        onChange={(e) => setFilterInputs({ ...filterInputs, org_id: e.target.value })}
                        sx={{ width: { xs: '100%', sm: 250 } }}
                    />
                    <Button variant="contained" color="primary" startIcon={<IconSearch size={22} />}
                        onClick={handleSearch} sx={{ borderRadius: 3, fontWeight: 700, fontSize: '1rem', py: 1, height: 40, px: 3 }}>
                        Tìm kiếm
                    </Button>
                </Stack>
            </Box>

            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            {isMobile && <TableCell width="40px" />}
                            <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Tên trạm</TableCell>
                            {!isMobile && <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Địa chỉ</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Thuộc</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Xí nghiệp quản lý</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Xí nghiệp phối hợp</TableCell>}
                            {!isMobile && <TableCell align="center" sx={{ fontWeight: 800, fontSize: '1rem' }}>Ưu tiên</TableCell>}
                            {!isMobile && <TableCell align="center" sx={{ fontWeight: 800, fontSize: '1rem' }}>Trọng số</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Ngưỡng</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Trạng thái</TableCell>}
                            {(canEdit || canDelete) && <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>Thao tác</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={isMobile ? 3 : 8} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : stations.length === 0 ? (
                            <TableRow><TableCell colSpan={isMobile ? 3 : 8} align="center" sx={{ py: 3 }}>Không tìm thấy trạm</TableCell></TableRow>
                        ) : (
                            stations.map((row) => (
                                <StationRow
                                    key={row.id}
                                    row={row}
                                    handleOpenEdit={handleOpenEdit}
                                    handleDelete={handleDelete}
                                    isMobile={isMobile}
                                    canEdit={canEdit && (isCompany || user?.org_id === row.org_id)}
                                    canDelete={canDelete && (isCompany || user?.org_id === row.org_id)}
                                    organizationName={getOrgName(row.org_id)}
                                    organizationNames={organizationNamesMap}
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

            <StationDialog
                open={dialogOpen} onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit} station={editingStation} isEdit={!!editingStation}
                type="rain" organizations={organizations}
            />
        </MainCard>
    );
};

export default StationRainList;
