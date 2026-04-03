import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, TablePagination, Typography, Chip, Box, Alert,
    Collapse, useTheme, useMediaQuery
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconSearch, IconBuilding, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import employeeApi from 'api/employee';
import organizationApi from 'api/organization';
import EmployeeDialog from './EmployeeDialog';

const EmployeeRow = ({ row, handleOpenEdit, handleDelete, roleLabel, orgName, userRole, isMobile }) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TableRow hover>
                {isMobile && (
                    <TableCell padding="checkbox">
                        <IconButton size="small" onClick={() => setOpen(!open)}>
                            {open ? <IconChevronUp /> : <IconChevronDown />}
                        </IconButton>
                    </TableCell>
                )}
                <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                {!isMobile && <TableCell>{row.email}</TableCell>}
                {!isMobile && userRole !== 'admin_org' && (
                    <TableCell>
                        <Typography variant="caption" color="textSecondary">{orgName(row.org_id)}</Typography>
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell>
                        <Chip label={roleLabel(row.role)} color={row.role === 'admin_org' ? 'info' : 'default'} size="small" variant="outlined" />
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell>
                        <Chip label={row.active ? 'Hoạt động' : 'Ngừng hoạt động'} color={row.active ? 'success' : 'default'} size="small" variant="outlined" />
                    </TableCell>
                )}
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                        <IconEdit size={20} />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                        <IconTrash size={20} />
                    </IconButton>
                </TableCell>
            </TableRow>
            {isMobile && (
                <TableRow>
                    <TableCell style={{ padding: 0 }} colSpan={3}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 0, backgroundColor: 'grey.50', p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom component="div" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                    Chi tiết người dùng
                                </Typography>
                                <Table size="small" aria-label="details">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, width: '40%', borderBottom: 'none' }}>Email</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>{row.email}</TableCell>
                                        </TableRow>
                                        {userRole !== 'admin_org' && (
                                            <TableRow>
                                                <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Công ty</TableCell>
                                                <TableCell sx={{ borderBottom: 'none' }}>
                                                    <Typography variant="body2">{orgName(row.org_id)}</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Vai trò</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>
                                                <Chip label={roleLabel(row.role)} color={row.role === 'admin_org' ? 'info' : 'default'} size="small" variant="outlined" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ fontWeight: 600, borderBottom: 'none' }}>Trạng thái</TableCell>
                                            <TableCell sx={{ borderBottom: 'none' }}>
                                                <Chip label={row.active ? 'Hoạt động' : 'Ngừng hoạt động'} color={row.active ? 'success' : 'default'} size="small" variant="outlined" />
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

const EmployeeList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const userRole = localStorage.getItem('role');
    const userOrgId = localStorage.getItem('org_id') || '';
    const [searchParams] = useSearchParams();
    const urlOrgId = searchParams.get('org_id') || userOrgId;
    const urlOrgName = searchParams.get('org_name') || '';

    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [filterInputs, setFilterInputs] = useState({ name: '', email: '', org_id: urlOrgId });
    const [params, setParams] = useState({ name: '', email: '', org_id: urlOrgId });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);

    // Fetch all orgs for the dialog dropdown
    const loadOrganizations = async () => {
        try {
            const res = await organizationApi.getAll({ per_page: 1000 });
            if (res.data?.status === 'success') {
                setOrganizations(Array.isArray(res.data.data?.data) ? res.data.data.data : []);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách công ty:', err);
        }
    };

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const res = await employeeApi.getAll({ ...params, page: page + 1, per_page: rowsPerPage });
            if (res.data?.status === 'success') {
                const result = res.data.data;
                setEmployees(Array.isArray(result.data) ? result.data : []);
                setTotalItems(result.total || 0);
            } else {
                setEmployees([]);
            }
        } catch (err) {
            console.error('Lỗi tải nhân viên:', err);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrganizations();
    }, []);

    useEffect(() => {
        loadEmployees();
    }, [page, rowsPerPage, params]);

    const handleSearch = () => { setPage(0); setParams(filterInputs); };
    const handleOpenCreate = () => { setEditingEmployee(null); setDialogOpen(true); };
    const handleOpenEdit = (employee) => { setEditingEmployee(employee); setDialogOpen(true); };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
        try {
            const res = await employeeApi.delete(id);
            if (res.data?.status === 'success') { toast.success('Xóa thành công'); loadEmployees(); }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa người dùng');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const dataToSubmit = { ...values };
            if (editingEmployee && !dataToSubmit.password) {
                delete dataToSubmit.password;
            }
            const res = editingEmployee
                ? await employeeApi.update(editingEmployee.id, dataToSubmit)
                : await employeeApi.create(dataToSubmit);
            if (res.data?.status === 'success') {
                toast.success(editingEmployee ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadEmployees();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    const roleLabel = (role) => {
        if (role === 'admin_org') return 'Quản lý';
        if (role === 'employee') return 'Nhân viên';
        return role;
    };

    const orgName = (orgId) => {
        const org = organizations.find(o => o.id === orgId);
        return org ? org.name : orgId;
    };

    return (
        <MainCard
            title={urlOrgName ? `Người dùng của: ${urlOrgName}` : 'Quản lý người dùng'}
            secondary={
                <AnimateButton>
                    <Button variant="contained" color="secondary" startIcon={<IconPlus size={18} />} onClick={handleOpenCreate}>
                        Thêm người dùng
                    </Button>
                </AnimateButton>
            }
        >
            {urlOrgName && (
                <Alert severity="info" icon={<IconBuilding size={20} />} sx={{ mb: 2, borderRadius: '12px' }}>
                    Đang hiển thị người dùng thuộc công ty: <strong>{urlOrgName}</strong>
                </Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Tên người dùng" value={filterInputs.name}
                        onChange={(e) => setFilterInputs({ ...filterInputs, name: e.target.value })}
                        size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Email" value={filterInputs.email}
                        onChange={(e) => setFilterInputs({ ...filterInputs, email: e.target.value })}
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
                            <TableCell sx={{ fontWeight: 700 }}>Tên</TableCell>
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>}
                            {!isMobile && userRole === 'super_admin' && <TableCell sx={{ fontWeight: 700 }}>Công ty</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Vai trò</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>}
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={isMobile ? 3 : (userRole === 'admin_org' ? 5 : 6)} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : employees.length === 0 ? (
                            <TableRow><TableCell colSpan={isMobile ? 3 : (userRole === 'admin_org' ? 5 : 6)} align="center" sx={{ py: 3 }}>Không tìm thấy người dùng</TableCell></TableRow>
                        ) : (
                            employees.map((row) => (
                                <EmployeeRow
                                    key={row.id}
                                    row={row}
                                    handleOpenEdit={handleOpenEdit}
                                    handleDelete={handleDelete}
                                    roleLabel={roleLabel}
                                    orgName={orgName}
                                    userRole={userRole}
                                    isMobile={isMobile}
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

            <EmployeeDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit}
                employee={editingEmployee}
                isEdit={!!editingEmployee}
                organizations={organizations}
                defaultOrgId={urlOrgId || userOrgId}
                userRole={userRole}
            />
        </MainCard>
    );
};

export default EmployeeList;
