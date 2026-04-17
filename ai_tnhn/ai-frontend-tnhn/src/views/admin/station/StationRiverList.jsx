import { useState, useEffect } from 'react';
import {
    Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, TablePagination, Typography, Chip, Tooltip
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconSearch } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import stationApi from 'api/station';
import organizationApi from 'api/organization';
import StationDialog from './StationDialog';
import useAuthStore from 'store/useAuthStore';
import { getDataArray, getTotalItems } from 'utils/apiHelper';

const StationRiverList = () => {
    const { user, isCompany, hasPermission } = useAuthStore();
    const canCreate = hasPermission('water:create');
    const canEdit = hasPermission('water:edit');
    const canDelete = hasPermission('water:delete');

    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [organizations, setOrganizations] = useState({ primary: [], shared: [] });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [filterInputs, setFilterInputs] = useState({ search: '', active: '' });
    const [params, setParams] = useState({ search: '', active: '' });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStation, setEditingStation] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [stRes, orgRes] = await Promise.all([
                stationApi.river.getAll({ ...params, page: page + 1, per_page: rowsPerPage }),
                organizationApi.getSelectionList()
            ]);

            // Interceptor đã bóc tách dữ liệu (.data cấp 1)
            if (stRes) {
                // Ưu tiên lấy danh sách trạm từ trường 'tram' nếu có (API weather)
                // Nếu không có 'tram', sử dụng getDataArray để lấy từ 'data' hoặc mảng trực tiếp
                const stationList = stRes.tram || getDataArray(stRes);
                setStations(stationList);
                setTotalItems(stRes.total || stationList.length);
            }

            if (orgRes) {
                setOrganizations(orgRes || { primary: [], shared: [] });
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
            await stationApi.river.delete(id);
            toast.success('Xóa thành công');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa trạm');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const res = editingStation
                ? await stationApi.river.update(editingStation.id, values)
                : await stationApi.river.create(values);
            
            if (res) {
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
            title="Quản lý trạm đo mực nước sông"
            secondary={canCreate && (
                <AnimateButton>
                    <Button variant="contained" color="secondary" startIcon={<IconPlus size={20} />} onClick={handleOpenCreate} sx={{ fontWeight: 700, fontSize: '1rem', px: 2, py: 1 }}>
                        Thêm trạm mới
                    </Button>
                </AnimateButton>
            )}
        >
            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Tìm theo tên trạm" value={filterInputs.search}
                        onChange={(e) => setFilterInputs({ ...filterInputs, search: e.target.value })}
                        sx={{
                            '& .MuiInputLabel-root': { fontSize: '1rem', fontWeight: 600 },
                            '& .MuiInputBase-input': { fontSize: '1rem' },
                            '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                        }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Button fullWidth variant="contained" color="primary" startIcon={<IconSearch size={22} />}
                        onClick={handleSearch} sx={{ borderRadius: '10px', fontWeight: 700, fontSize: '1rem', py: 1 }}>
                        Tìm kiếm
                    </Button>
                </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Tên trạm</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Xí nghiệp quản lý</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Xí nghiệp phối hợp</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Loại</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Địa chỉ</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Ưu tiên</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '1rem' }}>Trọng số</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Ngưỡng</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Trạng thái</TableCell>
                            {(canEdit || canDelete) && <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>Thao tác</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : stations.length === 0 ? (
                            <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3 }}>Không tìm thấy trạm</TableCell></TableRow>
                        ) : (
                            stations.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'primary.dark' }}>{row.TenTram}</TableCell>
                                    <TableCell sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{getOrgName(row.org_id) || '-'}</TableCell>
                                    <TableCell sx={{ fontSize: '0.85rem' }}>{row.share_all ? 'Tất cả xí nghiệp' : (row.shared_org_ids?.map(id => organizationNamesMap[id]).filter(n => n).join(', ') || '-')}</TableCell>
                                    <TableCell sx={{ fontSize: '1rem' }}>{row.Loai}</TableCell>
                                    <TableCell sx={{ fontSize: '0.95rem' }}>{row.DiaChi}</TableCell>
                                    <TableCell align="center" sx={{ fontSize: '1rem', fontWeight: 700 }}>{row.ThuTu || 0}</TableCell>
                                    <TableCell align="center" sx={{ fontSize: '1rem', fontWeight: 700 }}>{row.TrongSoBaoCao || 0}</TableCell>
                                    <TableCell sx={{ fontSize: '1rem', fontWeight: 700 }}>{row.NguongCanhBao || '-'}</TableCell>
                                    <TableCell>
                                        <Chip label={row.Active ? 'Hoạt động' : 'Ngừng'}
                                            color={row.Active ? 'success' : 'default'} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem', height: 24 }} />
                                    </TableCell>
                                    {(canEdit && (isCompany || user?.org_id === row.org_id) || (canDelete && (isCompany || user?.org_id === row.org_id))) && (
                                        <TableCell align="right">
                                            {canEdit && (isCompany || user?.org_id === row.org_id) && (
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton color="primary" onClick={() => handleOpenEdit(row)}>
                                                        <IconEdit size={20} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {canDelete && (isCompany || user?.org_id === row.org_id) && (
                                                <Tooltip title="Xóa">
                                                    <IconButton color="error" onClick={() => handleDelete(row.id)}>
                                                        <IconTrash size={20} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
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
                type="river" organizations={organizations}
            />
        </MainCard>
    );
};

export default StationRiverList;
