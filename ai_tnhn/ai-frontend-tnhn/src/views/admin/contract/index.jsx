import { useState, useEffect } from 'react';
import {
    Button, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, Typography, Collapse,
    Box, useTheme, useMediaQuery, Stack
} from '@mui/material';
import { 
    IconTrash, IconPlus, IconEdit, IconRefresh, 
    IconFileText, IconChevronDown, IconChevronUp, IconCash
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import contractApi from 'api/contract';
import ContractDialog from './ContractDialog';
import dayjs from 'dayjs';

const Row = ({ row, handleOpenEdit, handleDelete, isMobile, formatPrice, getTotalPrice }) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell width={60}>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                        color={open ? 'secondary' : 'default'}
                    >
                        {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconFileText size={18} style={{ marginRight: 8, color: '#1e88e5' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{row.name}</Typography>
                    </Box>
                </TableCell>
                {!isMobile && (
                    <TableCell>
                        <Typography variant="body2">
                            {row.start_date ? dayjs(row.start_date).format('DD/MM/YYYY') : '...'} - {row.end_date ? dayjs(row.end_date).format('DD/MM/YYYY') : '...'}
                        </Typography>
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>
                        {formatPrice(getTotalPrice(row.stages))}
                    </TableCell>
                )}
                <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                            <IconEdit size={20} />
                        </IconButton>
                        <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                            <IconTrash size={20} />
                        </IconButton>
                    </Stack>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 2, px: 4, bgcolor: 'grey.50', borderRadius: '8px', mb: 2, mx: 2 }}>
                            <Typography variant="h5" gutterBottom component="div" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconCash size={18} /> Chi tiết các giai đoạn thanh toán
                            </Typography>
                            {row.stages && row.stages.length > 0 ? (
                                <Table size="small" aria-label="stages">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Tên giai đoạn</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Số tiền</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {row.stages.map((stage, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell component="th" scope="row">
                                                    {stage.name || `Giai đoạn ${idx + 1}`}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                    {formatPrice(stage.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, pt: 2 }}>Tổng cộng</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, pt: 2, color: 'success.main', fontSize: '1rem' }}>
                                                {formatPrice(getTotalPrice(row.stages))}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            ) : (
                                <Typography variant="body2" color="textSecondary">Không có thông tin giai đoạn.</Typography>
                            )}
                            {row.note && (
                                <Box sx={{ mt: 2, p: 1.5, borderLeft: '4px solid', borderColor: 'secondary.main', bgcolor: 'white' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Ghi chú:</Typography>
                                    <Typography variant="body2">{row.note}</Typography>
                                </Box>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

const ContractList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(false);
    const [contracts, setContracts] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingContract, setEditingContract] = useState(null);

    const loadContracts = async () => {
        setLoading(true);
        try {
            const res = await contractApi.getAll();
            console.log('Contracts API response:', res.data);
            if (res.data?.status === 'success') {
                const dataArray = res.data.data?.data || res.data.data;
                setContracts(Array.isArray(dataArray) ? dataArray : []);
            } else {
                setContracts([]);
            }
        } catch (err) {
            console.error('Failed to load contracts');
            toast.error('Không thể tải danh sách hợp đồng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadContracts();
    }, []);

    const handleOpenCreate = () => {
        setEditingContract(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (contract) => {
        setEditingContract(contract);
        setDialogOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa hợp đồng này?')) return;
        try {
            const res = await contractApi.delete(id);
            if (res.data?.status === 'success') {
                toast.success('Xóa hợp đồng thành công');
                loadContracts();
            }
        } catch (err) {
            toast.error('Lỗi khi xóa hợp đồng');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const res = editingContract
                ? await contractApi.update(editingContract.id, values)
                : await contractApi.create(values);
            if (res.data?.status === 'success') {
                toast.success(editingContract ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadContracts();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    const formatPrice = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };

    const getTotalPrice = (stages) => {
        return stages?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
    };

    return (
        <MainCard
            title="Quản lý hợp đồng"
            secondary={
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <AnimateButton>
                        <IconButton color="primary" onClick={loadContracts} disabled={loading}>
                            <IconRefresh size={20} />
                        </IconButton>
                    </AnimateButton>
                    <AnimateButton>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<IconPlus size={18} />}
                            onClick={handleOpenCreate}
                        >
                            Thêm hợp đồng
                        </Button>
                    </AnimateButton>
                </Box>
            }
        >
            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', overflow: 'hidden' }}>
                <Table aria-label="collapsible table">
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell width={60} />
                            <TableCell sx={{ fontWeight: 700 }}>Tên hợp đồng</TableCell>
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Thời hạn</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Tổng giá trị</TableCell>}
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && contracts.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : contracts.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>Chưa có hợp đồng nào.</TableCell></TableRow>
                        ) : (
                            contracts?.map((row) => (
                                <Row 
                                    key={row.id} 
                                    row={row} 
                                    handleOpenEdit={handleOpenEdit} 
                                    handleDelete={handleDelete} 
                                    isMobile={isMobile}
                                    formatPrice={formatPrice}
                                    getTotalPrice={getTotalPrice}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <ContractDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit}
                contract={editingContract}
                isEdit={!!editingContract}
            />
        </MainCard>
    );
};

export default ContractList;
