import React from 'react';
import {
    Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Stack,
    IconButton, CircularProgress, TablePagination, Box, Alert,
    useTheme, useMediaQuery, Chip, Divider, Typography
} from '@mui/material';
import { IconPlus, IconBuilding } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import ConfirmDialog from 'ui-component/ConfirmDialog';
import EmployeeDialog from './EmployeeDialog';
import useEmployeeList from './hooks/useEmployeeList';
import EmployeeRow from './components/EmployeeRow';
import EmployeeCard from './components/EmployeeCard';

const EmployeeList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const {
        userRole,
        hasPermission,
        isCompanyLevel,
        urlOrgName,
        initialOrgId,
        employees,
        loading,
        totalItems,
        organizations,
        page,
        rowsPerPage,
        setPage,
        setRowsPerPage,
        filterInputs,
        setFilterInputs,
        dialogOpen,
        setDialogOpen,
        editingEmployee,
        confirmOpen,
        setConfirmOpen,
        deletingItem,
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleConfirmDelete,
        handleSubmit,
        roleLabel,
        orgName,
    } = useEmployeeList();

    return (
        <MainCard
            title={urlOrgName ? `Người dùng của: ${urlOrgName}` : 'Quản lý người dùng'}
            secondary={
                hasPermission('employee:create') && (
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
                            Thêm người dùng
                        </Button>
                    </AnimateButton>
                )
            }
        >
            {urlOrgName && (
                <Alert severity="info" icon={<IconBuilding size={20} />} sx={{ mb: 2, borderRadius: '12px' }}>
                    Đang hiển thị người dùng thuộc công ty: <strong>{urlOrgName}</strong>
                </Alert>
            )}

            <Box sx={{ mb: 3 }}>
                <Stack direction={isMobile ? "column" : "row"} spacing={1.5} alignItems="center">
                    <TextField fullWidth label="Tìm theo tên" value={filterInputs.name || ''}
                        onChange={(e) => setFilterInputs({ ...filterInputs, name: e.target.value })}
                        size="small"
                        slotProps={{ input: { sx: { borderRadius: 3 } } }}
                        sx={{ flex: 1 }}
                    />
                    <TextField fullWidth label="Email" value={filterInputs.email || ''}
                        onChange={(e) => setFilterInputs({ ...filterInputs, email: e.target.value })}
                        size="small"
                        slotProps={{ input: { sx: { borderRadius: 3 } } }}
                        sx={{ flex: 1 }}
                    />
                    {isCompanyLevel && (
                        <OrganizationSelect
                            value={filterInputs.org_id}
                            onChange={(e) => setFilterInputs({ ...filterInputs, org_id: e.target.value })}
                            size="small"
                            label="Đơn vị / Xí nghiệp"
                            sx={{ width: { xs: '100%', sm: 250 } }}
                        />
                    )}
                </Stack>
            </Box>

            {isMobile ? (
                loading ? (
                    <Box display="flex" justifyContent="center" py={5}>
                        <CircularProgress size={24} color="secondary" />
                    </Box>
                ) : employees.length === 0 ? (
                    <Box textAlign="center" py={5}>
                        <Typography color="textSecondary">Không tìm thấy người dùng</Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {employees.map((row) => (
                            <EmployeeCard
                                key={row.id}
                                row={row}
                                handleOpenEdit={handleOpenEdit}
                                handleDelete={handleDelete}
                                roleLabel={roleLabel}
                                orgName={orgName}
                                userRole={userRole}
                                hasPermission={hasPermission}
                            />
                        ))}
                        
                        <TablePagination
                            rowsPerPageOptions={[10, 25, 50]} component="div" count={totalItems}
                            rowsPerPage={rowsPerPage} page={page}
                            onPageChange={(e, newPage) => setPage(newPage)}
                            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                            labelRowsPerPage="Số dòng:"
                        />
                    </Stack>
                )
            ) : (
                <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Tên</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                {userRole !== 'admin_org' && <TableCell sx={{ fontWeight: 700 }}>Công ty</TableCell>}
                                <TableCell sx={{ fontWeight: 700 }}>Vai trò</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                <TableCell align="right" sx={{
                                    fontWeight: 700,
                                    position: 'sticky',
                                    right: 0,
                                    bgcolor: 'grey.50',
                                    zIndex: 2,
                                    borderLeft: '1px solid',
                                    borderColor: 'divider'
                                }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={userRole === 'admin_org' ? 5 : 6} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                            ) : employees.length === 0 ? (
                                <TableRow><TableCell colSpan={userRole === 'admin_org' ? 5 : 6} align="center" sx={{ py: 3 }}>Không tìm thấy người dùng</TableCell></TableRow>
                            ) : (
                                employees.map((row) => (
                                    <EmployeeRow
                                        key={row.id}
                                        row={row}
                                        handleOpenEdit={handleOpenEdit}
                                        handleDelete={() => handleDelete(row)}
                                        roleLabel={roleLabel}
                                        orgName={orgName}
                                        userRole={userRole}
                                        isMobile={false}
                                        hasPermission={hasPermission}
                                    />
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
            )}

            <EmployeeDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit}
                employee={editingEmployee}
                isEdit={!!editingEmployee}
                organizations={organizations}
                defaultOrgId={initialOrgId}
                userRole={userRole}
                canSelectOrg={isCompanyLevel}
            />

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                loading={loading}
                itemName={deletingItem?.name}
                title="Xóa người dùng"
                description="Bạn có chắc muốn xóa nhân viên này? Dữ liệu người dùng sẽ bị gỡ bỏ khỏi hệ thống."
            />
        </MainCard>
    );
};

export default EmployeeList;
