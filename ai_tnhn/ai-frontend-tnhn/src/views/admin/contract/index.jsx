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

import ContractRow from './ContractRow';

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
    const [parentContract, setParentContract] = useState(null);
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
        setParentContract(null);
        setEditingContract(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (contract) => {
        setParentContract(null);
        setEditingContract(contract);
        setDialogOpen(true);
    };

    const handleAddAppendix = (parent) => {
        setParentContract(parent);
        setEditingContract(null);
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
                            (() => {
                                const primaryContracts = contracts?.filter(c => !c.parent_id) || [];
                                return primaryContracts.map((row) => (
                                    <ContractRow 
                                        key={row.id} 
                                        row={row} 
                                        appendices={contracts?.filter(c => c.parent_id === row.id) || []}
                                        handleOpenEdit={handleOpenEdit} 
                                        handleDelete={handleDelete} 
                                        handleAddAppendix={handleAddAppendix}
                                        isMobile={isMobile}
                                        formatPrice={formatPrice}
                                        getTotalPrice={getTotalPrice}
                                        hasPermission={hasPermission}
                                    />
                                ));
                            })()
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
                parentContract={parentContract}
            />
        </MainCard>
    );
};

export default ContractList;
