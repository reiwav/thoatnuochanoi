import React from 'react';
import {
    Button, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, TablePagination, Typography,
    useTheme, useMediaQuery, Box, TextField, Stack, TableSortLabel
} from '@mui/material';
import PermissionGuard from 'ui-component/PermissionGuard';
import { IconPlus } from '@tabler/icons-react';
import ConfirmDialog from 'ui-component/ConfirmDialog';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import LakeDialog from './LakeDialog';

// Sub-components
import StationMobileCard from './components/StationMobileCard';
import StationDesktopRow from './components/StationDesktopRow';

// custom hook
import useLakeList from './hooks/useLakeList';

const StationLakeList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const {
        user,
        isCompanyLevel,
        isSuperAdmin,
        canCreate,
        canEdit,
        canDelete,
        loading,
        stations,
        organizations,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        totalItems,
        sortOrder,
        setSortOrder,
        filterInputs,
        setFilterInputs,
        dialogOpen,
        setDialogOpen,
        editingStation,
        confirmOpen,
        setConfirmOpen,
        deletingItem,
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleConfirmDelete,
        handleSubmit,
        organizationNamesMap,
        getOrgName,
        sortedStations
    } = useLakeList();

    return (
        <PermissionGuard permission="water:view" fallback={<Box sx={{ p: 3, textAlign: 'center' }}><Typography color="error" variant="h4">Bạn không có quyền truy cập vùng dữ liệu này.</Typography></Box>}>
            <MainCard
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>QUẢN LÝ TRẠM ĐO MỰC NƯỚC HỒ</Typography>
                    </Box>
                }
                secondary={
                    <PermissionGuard permission="water:create">
                        <AnimateButton>
                            <Button
                                variant="contained"
                                color="secondary"
                                startIcon={<IconPlus size={20} />}
                                onClick={handleOpenCreate}
                                sx={{
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                    px: 2.5,
                                    py: 1,
                                    boxShadow: '0 4px 12px rgba(103, 58, 183, 0.2)'
                                }}
                            >
                                {isMobile ? 'Thêm' : 'Thêm trạm mới'}
                            </Button>
                        </AnimateButton>
                    </PermissionGuard>
                }
            >
                <Box sx={{ mb: 3 }}>
                    <Stack direction={isMobile ? "column" : "row"} spacing={1.5} alignItems="center">
                        <TextField
                            label="Tìm theo tên trạm"
                            value={filterInputs.search}
                            placeholder="Nhập tên trạm..."
                            onChange={(e) => setFilterInputs({ ...filterInputs, search: e.target.value })}
                            size="small"
                            slotProps={{ input: { sx: { borderRadius: 3 } } }}
                            sx={{ width: { xs: '100%', sm: 300 } }}
                        />

                        {isCompanyLevel && (
                            <OrganizationSelect
                                value={filterInputs.org_id}
                                onChange={(e) => setFilterInputs({ ...filterInputs, org_id: e.target.value })}
                                sx={{ width: { xs: '100%', sm: 250 } }}
                            />
                        )}
                    </Stack>
                </Box>

                {/* Mobile View */}
                <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                            <CircularProgress size={32} color="secondary" />
                        </Box>
                    ) : stations.length === 0 ? (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <Typography variant="h4" color="text.secondary" fontWeight={600}>Không tìm thấy trạm</Typography>
                        </Box>
                    ) : (
                        stations.map((row) => (
                            <StationMobileCard
                                key={row.id}
                                row={row}
                                handleOpenEdit={handleOpenEdit}
                                handleDelete={() => handleDelete(row)}
                                canEdit={canEdit && (isSuperAdmin || isCompanyLevel || user?.org_id === row.org_id)}
                                canDelete={canDelete && (isSuperAdmin || isCompanyLevel || user?.org_id === row.org_id)}
                                organizationName={getOrgName(row.org_id)}
                            />
                        ))
                    )}
                </Box>

                {/* Desktop View */}
                <TableContainer component={Paper} sx={{
                    display: { xs: 'none', sm: 'block' },
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none',
                    borderRadius: '16px',
                    overflowX: 'auto'
                }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Tên trạm</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Old ID</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Địa chỉ</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Xí nghiệp quản lý</TableCell>
                                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontWeight: 800, fontSize: '0.9rem' }}>Xí nghiệp phối hợp</TableCell>
                                <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.9rem' }}>Phương thức</TableCell>
                                <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.9rem' }}>
                                    <TableSortLabel
                                        active={sortOrder !== 'default'}
                                        direction={sortOrder === 'default' ? 'asc' : sortOrder}
                                        onClick={() => {
                                            if (sortOrder === 'default') setSortOrder('desc');
                                            else if (sortOrder === 'desc') setSortOrder('asc');
                                            else setSortOrder('default');
                                        }}
                                    >
                                        Trọng số
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.9rem' }}>Ngưỡng</TableCell>
                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.9rem' }}>Trạng thái</TableCell>
                                {(canEdit || canDelete) && <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Thao tác</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 5 }}>
                                        <CircularProgress size={32} color="secondary" />
                                    </TableCell>
                                </TableRow>
                            ) : sortedStations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                                        <Typography variant="h4" color="text.secondary" fontWeight={600}>Không tìm thấy trạm</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedStations.map((row) => (
                                    <StationDesktopRow
                                        key={row.id}
                                        row={row}
                                        handleOpenEdit={handleOpenEdit}
                                        handleDelete={() => handleDelete(row)}
                                        canEdit={canEdit && (isSuperAdmin || isCompanyLevel || user?.org_id === row.org_id)}
                                        canDelete={canDelete && (isSuperAdmin || isCompanyLevel || user?.org_id === row.org_id)}
                                        organizationName={getOrgName(row.org_id)}
                                        organizationNamesMap={organizationNamesMap}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={totalItems}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        labelRowsPerPage={isMobile ? "" : "Số dòng:"}
                        sx={{
                            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                fontWeight: 700,
                                color: 'text.secondary'
                            }
                        }}
                    />
                </Box>

                <LakeDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSubmit={handleSubmit}
                    station={editingStation}
                    isEdit={!!editingStation}
                    organizations={organizations}
                />

                <ConfirmDialog
                    open={confirmOpen}
                    onClose={() => setConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    loading={loading}
                    itemName={deletingItem?.TenTram}
                    title="Xóa trạm mước hồ"
                    description="Bạn có chắc muốn xóa trạm đo mực nước hồ này? Dữ liệu lịch sử sẽ bị gỡ bỏ."
                />
            </MainCard>
        </PermissionGuard>
    );
};

export default StationLakeList;
