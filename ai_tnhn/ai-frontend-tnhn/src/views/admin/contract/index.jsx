import { useState, useEffect } from 'react';
import {
    Button, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, Typography, Collapse,
    Box, useTheme, useMediaQuery, Stack, TextField, InputAdornment
} from '@mui/material';
import { 
    IconTrash, IconPlus, IconEdit, IconRefresh, 
    IconFileText, IconChevronDown, IconChevronUp, IconCash, IconSearch
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import ContractDialog from './ContractDialog';
import dayjs from 'dayjs';
import useAuthStore from 'store/useAuthStore';
import useContractStore from 'store/useContractStore';
import PermissionGuard from 'ui-component/PermissionGuard';

const Row = ({ row, handleOpenEdit, handleDelete, isMobile, formatPrice, getTotalPrice, hasPermission }) => {
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
                        <PermissionGuard permission="contract:edit">
                            <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                                <IconEdit size={20} />
                            </IconButton>
                        </PermissionGuard>
                        <PermissionGuard permission="contract:delete">
                            <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                                <IconTrash size={20} />
                            </IconButton>
                        </PermissionGuard>
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
                                            <TableCell sx={{ fontWeight: 700 }}>Ngày dự kiến</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Số tiền</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {row.stages.map((stage, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell component="th" scope="row">
                                                    {stage.name || `Giai đoạn ${idx + 1}`}
                                                </TableCell>
                                                <TableCell>
                                                    {stage.date ? dayjs(stage.date).format('DD/MM/YYYY') : '---'}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                    {formatPrice(stage.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow>
                                            <TableCell colSpan={2} sx={{ fontWeight: 700, pt: 2, textAlign: 'right' }}>Tổng cộng:</TableCell>
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
                            {row.files && row.files.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <IconFileText size={18} /> Tài liệu đính kèm:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {row.files.map((file, idx) => (
                                            <Button
                                                key={idx}
                                                variant="outlined"
                                                size="small"
                                                startIcon={<IconFileText size={14} />}
                                                href={file.link || `https://drive.google.com/open?id=${file.id}`}
                                                target="_blank"
                                                sx={{ 
                                                    textTransform: 'none', 
                                                    borderRadius: '6px',
                                                    borderColor: 'divider',
                                                    bgcolor: 'white',
                                                    '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lightest' }
                                                }}
                                            >
                                                {file.name}
                                            </Button>
                                        ))}
                                    </Box>
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
    const { hasPermission } = useAuthStore();
    
    const { 
        contracts, loading, filters, 
        fetchContracts, setFilters, 
        createContract, updateContract, deleteContract 
    } = useContractStore();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [filterInput, setFilterInput] = useState(filters.name);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    const handleSearch = () => {
        setFilters({ name: filterInput });
        fetchContracts();
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

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
            await deleteContract(id);
            toast.success('Xóa hợp đồng thành công');
        } catch (err) {
            toast.error('Lỗi khi xóa hợp đồng');
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingContract) {
                await updateContract(editingContract.id, values);
            } else {
                await createContract(values);
            }
            toast.success(editingContract ? 'Cập nhật thành công' : 'Thêm mới thành công');
            setDialogOpen(false);
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
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="Tìm tên hợp đồng..."
                        value={filterInput}
                        onChange={(e) => setFilterInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" color="primary" onClick={handleSearch} edge="end">
                                            <IconSearch size={18} />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: '12px', bgcolor: 'grey.50', pr: 1 }
                            }
                        }}
                        sx={{ width: isMobile ? '180px' : '280px' }}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <AnimateButton>
                            <IconButton color="primary" onClick={handleSearch} disabled={loading}>
                                <IconRefresh size={20} />
                            </IconButton>
                        </AnimateButton>
                        <PermissionGuard permission="contract:create">
                            <AnimateButton>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    startIcon={<IconPlus size={18} />}
                                    onClick={handleOpenCreate}
                                    sx={{ whiteSpace: 'nowrap' }}
                                >
                                    {!isMobile && 'Thêm hợp đồng'}
                                </Button>
                            </AnimateButton>
                        </PermissionGuard>
                    </Box>
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
                                    hasPermission={hasPermission}
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
