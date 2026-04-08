import { useState, useEffect } from 'react';
import {
    Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, Typography, Tooltip, Box, useTheme, Stack, Chip
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconSearch, IconShieldCheck } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import axiosClient from 'api/axiosClient';
import RoleDialog from './RoleDialog';
import useAuthStore from 'store/useAuthStore';
import * as ROLES from 'constants/role';

const RoleList = () => {
    const theme = useTheme();
    const { hasPermission } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    const loadRoles = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/roles');
            if (res.data?.status === 'success') {
                setRoles(res.data.data || []);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách vai trò:', err);
            toast.error('Không thể tải danh sách vai trò');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoles();
    }, []);

    const handleOpenCreate = () => {
        setEditingRole(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (role) => {
        setEditingRole(role);
        setDialogOpen(true);
    };

    const handleDelete = async (id, code) => {
        if (code === ROLES.ROLE_SUPER_ADMIN) {
            toast.error('Không thể xóa vai trò Super Admin hệ thống');
            return;
        }
        if (!window.confirm('Bạn có chắc chắn muốn xóa vai trò này?')) return;
        try {
            const res = await axiosClient.delete(`/admin/roles/${id}`);
            if (res.data?.status === 'success') {
                toast.success('Xóa thành công');
                loadRoles();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa vai trò');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const res = editingRole
                ? await axiosClient.put(`/admin/roles/${editingRole.id}`, values)
                : await axiosClient.post('/admin/roles', values);
            if (res.data?.status === 'success') {
                toast.success(editingRole ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadRoles();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    const filteredRoles = roles.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainCard
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconShieldCheck size={24} color={theme.palette.primary.main} />
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>Quản lý Vai trò (Roles)</Typography>
                </Box>
            }
            secondary={
                hasPermission('role:edit') && (
                    <AnimateButton>
                        <Button variant="contained" color="secondary" startIcon={<IconPlus size={18} />} onClick={handleOpenCreate}>
                            Thêm Vai trò
                        </Button>
                    </AnimateButton>
                )
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
                        InputProps={{
                            startAdornment: <IconSearch size={18} style={{ marginRight: 8, color: '#919eab' }} />,
                            sx: { borderRadius: '12px' }
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
                            <TableCell sx={{ fontWeight: 800 }}>Cấp</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Mô tả</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, pr: 3 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : filteredRoles.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Không tìm thấy vai trò nào</TableCell></TableRow>
                        ) : (
                            filteredRoles.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell sx={{ fontWeight: 600, pl: 3 }}>{row.name}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 700, bgcolor: 'primary.lighter', px: 1, py: 0.5, borderRadius: 1.5, display: 'inline-block' }}>
                                            {row.code}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={row.is_company ? 'Công ty' : 'Xí nghiệp'} 
                                            color={row.is_company ? 'primary' : 'default'}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ color: 'text.secondary' }}>
                                        <Typography variant="body2" sx={{ 
                                            maxWidth: 250, 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis', 
                                            whiteSpace: 'nowrap' 
                                        }}>
                                            {row.description || '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ pr: 3 }}>
                                        {hasPermission('role:edit') && (
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton color="primary" onClick={() => handleOpenEdit(row)}>
                                                        <IconEdit size={20} />
                                                    </IconButton>
                                                </Tooltip>
                                                {row.code !== 'super_admin' && (
                                                    <Tooltip title="Xóa">
                                                        <IconButton color="error" onClick={() => handleDelete(row.id, row.code)}>
                                                            <IconTrash size={20} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        )}
                                    </TableCell>
                                </TableRow>
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
