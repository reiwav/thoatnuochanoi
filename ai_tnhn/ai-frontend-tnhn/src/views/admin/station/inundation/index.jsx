import React from 'react';
import {
    Button, Stack, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, Box, useTheme, useMediaQuery
} from '@mui/material';
import PermissionGuard from 'ui-component/PermissionGuard';
import ConfirmDialog from 'ui-component/ConfirmDialog';
import { IconPlus } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import InundationDialog from './InundationDialog';

// Custom components and hooks
import useInundationList from './hooks/useInundationList';
import InundationMobileCard from './components/InundationMobileCard';
import InundationDesktopRow from './components/InundationDesktopRow';

const StationInundationList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const {
        user,
        isCompany,
        isSuperAdmin,
        hasPermission,
        canCreate,
        canEdit,
        canDelete,
        loading,
        points,
        organizations,
        dialogOpen,
        setDialogOpen,
        editingPoint,
        confirmOpen,
        setConfirmOpen,
        deletingItem,
        searchFilter,
        setSearchFilter,
        orgFilter,
        setOrgFilter,
        organizationNamesMap,
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleConfirmDelete,
        handleSubmit
    } = useInundationList();

    return (
        <PermissionGuard permission="inundation:view" fallback={<Box sx={{ p: 3, textAlign: 'center' }}><Typography color="error" variant="h4">Bạn không có quyền truy cập vùng dữ liệu này.</Typography></Box>}>
            <MainCard
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>QUẢN LÝ ĐIỂM NGẬP ÚNG</Typography>
                    </Box>
                }
                secondary={
                    <PermissionGuard permission="inundation:create">
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
                                {isMobile ? 'Thêm' : 'Thêm điểm mới'}
                            </Button>
                        </AnimateButton>
                    </PermissionGuard>
                }
            >
                <Box sx={{ mb: 3 }}>
                    <Stack direction={isMobile ? "column" : "row"} spacing={1.5} alignItems="center">
                        <TextField
                            placeholder="Tìm tên điểm, địa chỉ..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            size="small"
                            slotProps={{ input: { sx: { borderRadius: 3 } } }}
                            sx={{ width: { xs: '100%', sm: 300 } }}
                        />
                        <OrganizationSelect
                            value={orgFilter}
                            onChange={(e) => setOrgFilter(e.target.value)}
                            sx={{ width: { xs: '100%', sm: 250 } }}
                        />
                    </Stack>
                </Box>

                {/* Mobile View */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={32} color="secondary" /></Box>
                    ) : points.length === 0 ? (
                        <Typography align="center" sx={{ py: 3, color: 'text.secondary' }}>Không tìm thấy điểm ngập</Typography>
                    ) : (
                        points.map((row) => (
                            <InundationMobileCard
                                key={row.id}
                                row={row}
                                handleOpenEdit={handleOpenEdit}
                                handleDelete={handleDelete}
                                canEdit={canEdit && (isSuperAdmin || isCompany || user?.org_id === row.org_id)}
                                canDelete={canDelete && (isSuperAdmin || isCompany || user?.org_id === row.org_id)}
                                organizationNamesMap={organizationNamesMap}
                            />
                        ))
                    )}
                </Box>

                {/* Desktop Table View */}
                <TableContainer component={Paper} elevation={0} sx={{ 
                    display: { xs: 'none', md: 'block' },
                    border: '1px solid', 
                    borderColor: 'divider', 
                    boxShadow: 'none', 
                    borderRadius: '16px',
                    overflowX: 'auto'
                }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Tên điểm</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Địa chỉ</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Đơn vị quản lý</TableCell>
                                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Đơn vị phối hợp</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Trạng thái</TableCell>
                                {(canEdit || canDelete) && <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Thao tác</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                            ) : points.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>Không tìm thấy điểm ngập</TableCell></TableRow>
                            ) : (
                                points.map((row) => (
                                    <InundationDesktopRow
                                        key={row.id}
                                        row={row}
                                        handleOpenEdit={handleOpenEdit}
                                        handleDelete={handleDelete}
                                        canEdit={canEdit && (isSuperAdmin || isCompany || user?.org_id === row.org_id)}
                                        canDelete={canDelete && (isSuperAdmin || isCompany || user?.org_id === row.org_id)}
                                        organizationNamesMap={organizationNamesMap}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <InundationDialog 
                    open={dialogOpen} 
                    onClose={() => setDialogOpen(false)} 
                    station={editingPoint} 
                    isEdit={!!editingPoint}
                    onSubmit={handleSubmit} 
                    organizations={organizations} 
                />

                <ConfirmDialog
                    open={confirmOpen}
                    onClose={() => setConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    loading={loading}
                    itemName={deletingItem?.name}
                    title="Xóa điểm ngập"
                    description="Bạn có chắc muốn xóa điểm ngập này? Dữ liệu thống kê có liên quan cũng sẽ bị gỡ bỏ."
                />
            </MainCard>
        </PermissionGuard>
    );
};

export default StationInundationList;
