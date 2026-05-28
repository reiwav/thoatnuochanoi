import React from 'react';
import {
    Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, TablePagination, useTheme, useMediaQuery
} from '@mui/material';
import { IconPlus, IconSearch } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import OrganizationDialog from './OrganizationDialog';
import useOrganizationList from './hooks/useOrganizationList';
import OrgRow from './components/OrgRow';

const OrganizationList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    const {
        hasPermission,
        organizations,
        loading,
        totalItems,
        page,
        rowsPerPage,
        setPage,
        setRowsPerPage,
        filterInputs,
        setFilterInputs,
        dialogOpen,
        setDialogOpen,
        editingOrg,
        handleSearch,
        handleOpenCreate,
        handleOpenEdit,
        handleManageUsers,
        handleDelete,
        handleSubmit
    } = useOrganizationList();

    return (
        <MainCard
            title="Quản lý đơn vị"
            secondary={
                hasPermission('organization:create') && (
                    <AnimateButton>
                        <Button variant="contained" color="secondary" startIcon={<IconPlus size={18} />} onClick={handleOpenCreate}>
                            Thêm đơn vị
                        </Button>
                    </AnimateButton>
                )
            }
        >
            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Tên đơn vị" value={filterInputs.name || ''}
                        onChange={(e) => setFilterInputs({ ...filterInputs, name: e.target.value })}
                        size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Mã công ty" value={filterInputs.code || ''}
                        onChange={(e) => setFilterInputs({ ...filterInputs, code: e.target.value })}
                        size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                </Grid>
                <Grid item xs={12} sm={2}>
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
                            {isMobile && <TableCell width="40px" />}
                            <TableCell sx={{ fontWeight: 700 }}>Tên đơn vị</TableCell>
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Mã</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Lệnh số</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Thông tin liên hệ</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>}
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={isMobile ? 3 : 6} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : organizations.length === 0 ? (
                            <TableRow><TableCell colSpan={isMobile ? 3 : 6} align="center" sx={{ py: 3 }}>Không tìm thấy công ty</TableCell></TableRow>
                        ) : (
                            organizations.map((row) => (
                                <OrgRow
                                    key={row.id}
                                    row={row}
                                    handleManageUsers={handleManageUsers}
                                    handleOpenEdit={handleOpenEdit}
                                    handleDelete={handleDelete}
                                    isMobile={isMobile}
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

            <OrganizationDialog
                open={dialogOpen} onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit} organization={editingOrg} isEdit={!!editingOrg}
            />
        </MainCard>
    );
};

export default OrganizationList;
