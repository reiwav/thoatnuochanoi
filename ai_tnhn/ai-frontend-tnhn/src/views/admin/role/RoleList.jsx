import React from 'react';
import {
    Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, Box, useTheme
} from '@mui/material';
import { IconPlus, IconSearch, IconShieldCheck } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import RoleDialog from './RoleDialog';
import PermissionGuard from 'ui-component/PermissionGuard';
import useRoleList from './hooks/useRoleList';
import RoleRow from './components/RoleRow';

const RoleList = () => {
    const theme = useTheme();
    
    const {
        loading,
        searchQuery,
        setSearchQuery,
        dialogOpen,
        setDialogOpen,
        editingRole,
        filteredRoles,
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleSubmit
    } = useRoleList();

    return (
        <MainCard
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconShieldCheck size={24} color={theme.palette.primary.main} />
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>Quản lý Vai trò (Roles)</Typography>
                </Box>
            }
            secondary={
                <PermissionGuard permission="role:edit">
                    <AnimateButton>
                        <Button variant="contained" color="secondary" startIcon={<IconPlus size={18} />} onClick={handleOpenCreate}>
                            Thêm Vai trò
                        </Button>
                    </AnimateButton>
                </PermissionGuard>
            }
        >
            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        placeholder="Tìm kiếm theo tên hoặc mã vai trò..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        slotProps={{
                            input: {
                                startAdornment: <IconSearch size={18} style={{ marginRight: 8, color: '#919eab' }} />,
                                sx: { borderRadius: '12px' }
                            }
                        }}
                    />
                </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800, py: 2, pl: 3 }}>Tên Vai trò</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Mã (Code)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Level</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Nhóm (Group)</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Phân loại</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Nhân sự</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Mô tả</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, pr: 3 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : filteredRoles.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3 }}>Không tìm thấy vai trò nào</TableCell></TableRow>
                        ) : (
                            filteredRoles.map((row) => (
                                <RoleRow
                                    key={row.id}
                                    row={row}
                                    handleOpenEdit={handleOpenEdit}
                                    handleDelete={handleDelete}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <RoleDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit}
                role={editingRole}
                isEdit={!!editingRole}
            />
        </MainCard>
    );
};

export default RoleList;
