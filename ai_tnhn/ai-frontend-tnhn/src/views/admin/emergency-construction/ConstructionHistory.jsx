import { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, TablePagination, Typography, Chip, Box
} from '@mui/material';
import emergencyConstructionApi from 'api/emergencyConstruction';

const ConstructionHistory = () => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const res = await emergencyConstructionApi.getGlobalHistory({ page: page + 1, per_page: rowsPerPage });
            if (res.data?.status === 'success') {
                setItems(res.data.data?.data || []);
                setTotalItems(res.data.data?.total || 0);
            }
        } catch (err) {
            console.error('Lỗi tải lịch sử:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [page, rowsPerPage]);

    const getActionChip = (action) => {
        const config = {
            create: { label: 'Tạo mới', color: 'success' },
            update_status: { label: 'Cập nhật trạng thái', color: 'info' },
            update_info: { label: 'Cập nhật thông tin', color: 'primary' },
            delete: { label: 'Xóa', color: 'error' }
        };
        const a = config[action] || { label: action, color: 'default' };
        return <Chip label={a.label} color={a.color} size="small" variant="filled" />;
    };

    const getStatusLabel = (status) => {
        const config = {
            planned: 'Dự kiến',
            ongoing: 'Đang thi công',
            completed: 'Hoàn thành',
            suspended: 'Tạm dừng'
        };
        return config[status] || status;
    };

    return (
        <Box>
            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Thay đổi trạng thái</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Ghi chú</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Người thực hiện</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Chưa có lịch sử thay đổi</TableCell></TableRow>
                        ) : (
                            items.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>{new Date(row.created_at * 1000).toLocaleString('vi-VN')}</TableCell>
                                    <TableCell>{getActionChip(row.action)}</TableCell>
                                    <TableCell>
                                        {row.old_status && (
                                            <Typography variant="body2" component="span">
                                                {getStatusLabel(row.old_status)} →
                                            </Typography>
                                        )}
                                        <Typography variant="body2" component="span" sx={{ fontWeight: 600, ml: 0.5 }}>
                                            {getStatusLabel(row.new_status)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{row.note}</TableCell>
                                    <TableCell>{row.updated_by}</TableCell>
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
        </Box>
    );
};

export default ConstructionHistory;
