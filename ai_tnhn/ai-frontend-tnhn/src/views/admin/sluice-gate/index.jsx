import React from 'react';
import MainCard from 'ui-component/cards/MainCard';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { IconPlus, IconDoorEnter } from '@tabler/icons-react';
import { CircularProgress, Box, Typography, Paper, useTheme, useMediaQuery, TextField } from '@mui/material';
import SluiceGateDialog from './SluiceGateDialog';
import SluiceGateHistoryDialog from './SluiceGateHistoryDialog';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import PermissionGuard from 'ui-component/PermissionGuard';
import ConfirmDialog from 'ui-component/ConfirmDialog';
import AnimateButton from 'ui-component/extended/AnimateButton';

// custom hooks and components
import useSluiceGateList from './hooks/useSluiceGateList';
import SluiceGateDesktopRow from './components/SluiceGateDesktopRow';
import SluiceGateMobileCard from './components/SluiceGateMobileCard';

const SluiceGatePage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    const {
        user,
        isCompany,
        hasPermission,
        loading,
        open,
        setOpen,
        openHistory,
        setOpenHistory,
        selected,
        confirmOpen,
        setConfirmOpen,
        deletingItem,
        orgs,
        orgFilter,
        setOrgFilter,
        searchFilter,
        setSearchFilter,
        filteredData,
        loadData,
        handleAdd,
        handleEdit,
        handleHistory,
        handleDelete,
        handleConfirmDelete,
        getOrgNames
    } = useSluiceGateList();

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    if (!hasPermission(['sluice-gate:view', 'sluice-gate:edit', 'sluice-gate:control'])) return null;

    return (
        <MainCard
            title={
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <IconDoorEnter size={isMobile ? 22 : 28} color={theme.palette.primary.main} />
                    <Typography variant={isMobile ? 'h4' : 'h3'} sx={{ fontWeight: 900 }}>
                        QUẢN LÝ CỬA PHAI
                    </Typography>
                </Stack>
            }
            secondary={
                <PermissionGuard permission="sluice-gate:create">
                    <AnimateButton>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<IconPlus size={20} />}
                            onClick={handleAdd}
                            sx={{ borderRadius: 2.5, fontWeight: 800, px: 3, boxShadow: theme.shadows[4] }}
                        >
                            Thêm cửa phai
                        </Button>
                    </AnimateButton>
                </PermissionGuard>
            }
        >
            <Box sx={{ mb: 4 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        label="Tìm kiếm cửa phai"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        size="small"
                        sx={{ width: { xs: '100%', sm: 300 } }}
                    />
                    <OrganizationSelect
                        value={orgFilter}
                        onChange={(e) => setOrgFilter(e.target.value)}
                        sx={{ width: { xs: '100%', sm: 300 } }}
                    />
                </Stack>
            </Box>

            {/* Mobile View */}
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                {filteredData.map((item) => (
                    <SluiceGateMobileCard
                        key={item.id}
                        item={item}
                        getOrgNames={getOrgNames}
                        handleHistory={handleHistory}
                        handleEdit={handleEdit}
                        handleDelete={handleDelete}
                        hasPermission={hasPermission}
                        isCompany={isCompany}
                        user={user}
                    />
                ))}
            </Box>

            {/* Desktop View */}
            <TableContainer component={Paper} elevation={0} sx={{ display: { xs: 'none', sm: 'block' }, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ width: 40 }} />
                            <TableCell sx={{ fontWeight: 800 }}>STT</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Tên cửa phai</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>Số lượng</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Địa chỉ</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Đơn vị quản lý</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>Ưu tiên</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>Không có dữ liệu cửa phai</TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item, index) => (
                                <SluiceGateDesktopRow
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    getOrgNames={getOrgNames}
                                    handleHistory={handleHistory}
                                    handleEdit={handleEdit}
                                    handleDelete={handleDelete}
                                    hasPermission={hasPermission}
                                    isCompany={isCompany}
                                    user={user}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <SluiceGateDialog
                open={open}
                handleClose={() => setOpen(false)}
                item={selected}
                refresh={loadData}
                organizations={orgs}
            />
            <SluiceGateHistoryDialog
                open={openHistory}
                handleClose={() => setOpenHistory(false)}
                item={selected}
            />
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                loading={loading}
                itemName={deletingItem?.name}
                title="Xóa cửa phai"
                description="Bạn có chắc chắn muốn xóa cửa phai này? Mọi dữ liệu liên quan sẽ bị xóa vĩnh viễn."
            />
        </MainCard>
    );
};

export default SluiceGatePage;
