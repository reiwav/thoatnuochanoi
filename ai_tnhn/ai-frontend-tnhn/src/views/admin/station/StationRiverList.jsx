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
import StationDialog from './StationDialog';

const StationRiverList = () => {
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [filterInputs, setFilterInputs] = useState({ search: '', active: '' });
    const [params, setParams] = useState({ search: '', active: '' });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStation, setEditingStation] = useState(null);

    const loadStations = async () => {
        setLoading(true);
        try {
            const res = await stationApi.river.getAll({ ...params, page: page + 1, per_page: rowsPerPage });
            if (res.data?.status === 'success') {
                const result = res.data.data;
                setStations(Array.isArray(result.data) ? result.data : []);
                setTotalItems(result.total || 0);
            } else {
                setStations([]);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách trạm sông:', err);
            setStations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStations(); }, [page, rowsPerPage, params]);

    const handleSearch = () => { setPage(0); setParams(filterInputs); };
    const handleOpenCreate = () => { setEditingStation(null); setDialogOpen(true); };
    const handleOpenEdit = (station) => { setEditingStation(station); setDialogOpen(true); };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa trạm này?')) return;
        try {
            const res = await stationApi.river.delete(id);
            if (res.data?.status === 'success') { toast.success('Xóa thành công'); loadStations(); }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa trạm');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const payload = { ...values };
            const res = editingStation
                ? await stationApi.river.update(editingStation.id, payload)
                : await stationApi.river.create(payload);
            if (res.data?.status === 'success') {
                toast.success(editingStation ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadStations();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    return (
        <MainCard
            title="Quản lý trạm đo mực nước sông"
            secondary={
                <AnimateButton>
                    <Button variant="contained" color="secondary" startIcon={<IconPlus size={18} />} onClick={handleOpenCreate}>
                        Thêm trạm mới
                    </Button>
                </AnimateButton>
            }
        >
            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Tìm theo tên trạm" value={filterInputs.search}
                        onChange={(e) => setFilterInputs({ ...filterInputs, search: e.target.value })}
                        size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                </Grid>
                <Grid item xs={12} sm={3}>
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
                            <TableCell sx={{ fontWeight: 700 }}>Tên trạm</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Loại</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Địa chỉ</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Tọa độ (Lat, Lng)</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Ngưỡng (m)</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : stations.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>Không tìm thấy trạm</TableCell></TableRow>
                        ) : (
                            stations.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>{row.TenTram}</TableCell>
                                    <TableCell>{row.Loai}</TableCell>
                                    <TableCell>{row.DiaChi}</TableCell>
                                    <TableCell>{row.Lat}, {row.Lng}</TableCell>
                                    <TableCell>{row.NguongCanhBao || '-'}</TableCell>
                                    <TableCell>
                                        <Chip label={row.Active ? 'Hoạt động' : 'Ngừng hoạt động'}
                                            color={row.Active ? 'success' : 'default'} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell align="right">
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
                type="river"
            />
        </MainCard>
    );
};

export default StationRiverList;
