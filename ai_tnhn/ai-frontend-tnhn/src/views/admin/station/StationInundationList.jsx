import { useState, useEffect } from 'react';
import {
    Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, Typography, Chip, Tooltip
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import stationApi from 'api/station';
import StationDialog from './StationDialog';

const StationInundationList = () => {
    const [loading, setLoading] = useState(false);
    const [points, setPoints] = useState([]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);

    const loadPoints = async () => {
        setLoading(true);
        try {
            const res = await stationApi.inundation.getAll();
            if (res.data?.status === 'success') {
                setPoints(Array.isArray(res.data.data) ? res.data.data : []);
            } else {
                setPoints([]);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách điểm ngập:', err);
            setPoints([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPoints(); }, []);

    const handleOpenCreate = () => { setEditingPoint(null); setDialogOpen(true); };
    const handleOpenEdit = (point) => { setEditingPoint(point); setDialogOpen(true); };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa điểm ngập này?')) return;
        try {
            const res = await stationApi.inundation.delete(id);
            if (res.data?.status === 'success') { toast.success('Xóa thành công'); loadPoints(); }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa điểm ngập');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const payload = {
                name: values.TenTram,
                address: values.DiaChi,
                lat: values.Lat,
                lng: values.Lng,
                active: values.Active
            };
            const res = editingPoint
                ? await stationApi.inundation.update(editingPoint.id, payload)
                : await stationApi.inundation.create(payload);
            if (res.data?.status === 'success') {
                toast.success(editingPoint ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadPoints();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    return (
        <MainCard
            title="Quản lý điểm ngập úng"
            secondary={
                <AnimateButton>
                    <Button variant="contained" color="secondary" startIcon={<IconPlus size={18} />} onClick={handleOpenCreate}>
                        Thêm điểm mới
                    </Button>
                </AnimateButton>
            }
        >
            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Tên điểm</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Địa chỉ</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Tọa độ (Lat, Lng)</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : points.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Không tìm thấy điểm ngập</TableCell></TableRow>
                        ) : (
                            points.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                                    <TableCell>{row.address}</TableCell>
                                    <TableCell>{row.lat}, {row.lng}</TableCell>
                                    <TableCell>
                                        <Chip label={row.active ? 'Hoạt động' : 'Ngừng hoạt động'}
                                            color={row.active ? 'success' : 'default'} size="small" variant="outlined" />
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
            </TableContainer>

            <StationDialog
                open={dialogOpen} onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit} station={editingPoint} isEdit={!!editingPoint}
                type="inundation"
            />
        </MainCard>
    );
};

export default StationInundationList;
