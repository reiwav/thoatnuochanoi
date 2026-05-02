import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Stack,
    IconButton, CircularProgress, TablePagination, Typography, Chip, Box, Alert,
    Collapse, useTheme, useMediaQuery, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconSearch, IconBuilding, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import ConfirmDialog from 'ui-component/ConfirmDialog';
import EmployeeDialog from './EmployeeDialog';
import useAuthStore from 'store/useAuthStore';
import useEmployeeStore from 'store/useEmployeeStore';
import useOrganizationStore from 'store/useOrganizationStore';
import axiosClient from 'api/axiosClient';
import * as ROLES from 'constants/role';

const stringToColor = (string) => {
    let hash = 0;
    let i;
    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
};

const getContrastText = (hexcolor) => {
    if (!hexcolor || hexcolor.length < 7) return '#fff';
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000' : '#fff';
};

const EmployeeRow = ({ row, handleOpenEdit, handleDelete, roleLabel, orgName, userRole, isMobile, hasPermission }) => {
    const [open, setOpen] = useState(false);
    const roleTxt = roleLabel(row.role);
    const bgColor = stringToColor(roleTxt);
    const textColor = getContrastText(bgColor);

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
                        <Chip
                            label={roleTxt}
                            size="small"
                            sx={{
                                bgcolor: bgColor,
                                color: textColor,
                                fontWeight: 700,
                                borderRadius: '8px',
                                border: 'none'
                            }}
                        />
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell>
                        <Chip label={row.active ? 'Hoạt động' : 'Ngừng hoạt động'} color={row.active ? 'success' : 'default'} size="small" variant="outlined" />
                    </TableCell>
                )}
                <TableCell align="right" sx={{
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    right: 0,
                    bgcolor: 'background.paper',
                    zIndex: 1,
                    borderLeft: '1px solid',
                    borderColor: 'divider'
                }}>
                    {hasPermission('employee:edit') && (
                        <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                            <IconEdit size={20} />
                        </IconButton>
                    )}
                    {hasPermission('employee:delete') && (
                        <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                            <IconTrash size={20} />
                        </IconButton>
                    )}
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
                                                <Chip
                                                    label={roleTxt}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: bgColor,
                                                        color: textColor,
                                                        fontWeight: 700,
                                                        borderRadius: '8px',
                                                        border: 'none'
                                                    }}
                                                />
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

    const { role: userRole, user: userInfo, hasPermission } = useAuthStore();
    const userOrgId = userInfo?.org_id || '';

    const {
        employees, loading, totalItems, page, rowsPerPage, filters,
        fetchEmployees, setPage, setRowsPerPage, setFilters,
        createEmployee, updateEmployee, deleteEmployee
    } = useEmployeeStore();

    const { fetchSelectionList } = useOrganizationStore();
    const [organizations, setOrganizations] = useState([]);
    const [roles, setRoles] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);

    const [searchParams] = useSearchParams();
    const urlOrgId = searchParams.get('org_id') || filters.org_id || userOrgId;
    const urlOrgName = searchParams.get('org_name') || '';

    // Khởi tạo bộ lọc thông minh: Tránh việc gọi API 2 lần (1 lần không có org_id, 1 lần có org_id do OrganizationSelect ép vào)
    const isCompanyLevel = userRole === 'super_admin' || userInfo?.is_company;
    const initialOrgId = (!isCompanyLevel && userInfo?.org_id) ? userInfo.org_id : (urlOrgId || '');

    const [filterInputs, setFilterInputs] = useState({ ...filters, org_id: initialOrgId });
    const isFirstRender = useRef(true);

    const loadMetadata = async () => {
        try {
            const [orgRes, roleRes] = await Promise.all([
                fetchSelectionList(),
                axiosClient.get('/admin/roles')
            ]);

            if (orgRes) {
                const list = Array.isArray(orgRes) ? orgRes : [...(orgRes.primary || []), ...(orgRes.shared || [])];
                // Deduplicate by ID
                const uniqueList = Array.from(new Map(list.map(item => [item.id, item])).values());
                setOrganizations(uniqueList);
            }
            if (roleRes) {
                setRoles(roleRes || []);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách cấu hình:', err);
        }
    };

    // Cơ chế Auto-search với debounce 500ms
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            // Nếu giá trị khởi tạo khác với filters hiện tại của store, ta cập nhật lại store
            if (JSON.stringify(filterInputs) !== JSON.stringify(filters)) {
                setFilters(filterInputs);
            }
            return;
        }

        const timer = setTimeout(() => {
            setFilters(filterInputs);
            setPage(0);
        }, 500);

        return () => clearTimeout(timer);
    }, [filterInputs, setFilters, setPage]);

    useEffect(() => {
        loadMetadata();
        fetchEmployees();
    }, [page, rowsPerPage, filters, fetchEmployees]);

    const handleOpenCreate = () => { setEditingEmployee(null); setDialogOpen(true); };
    const handleOpenEdit = (employee) => { setEditingEmployee(employee); setDialogOpen(true); };

    const handleDelete = (item) => {
        setDeletingItem(item);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingItem) return;
        try {
            await deleteEmployee(deletingItem.id);
            toast.success('Xóa thành công');
            setConfirmOpen(false);
            setDeletingItem(null);
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
            if (editingEmployee) {
                await updateEmployee(editingEmployee.id, dataToSubmit);
            } else {
                await createEmployee(dataToSubmit);
            }
            toast.success(editingEmployee ? 'Cập nhật thành công' : 'Thêm mới thành công');
            setDialogOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    const roleLabel = (role) => {
        const found = roles.find(r => r.code === role);
        if (found) return found.name;
        if (role === 'admin_org') return 'Quản lý (Legacy)';
        if (role === 'employee') return 'Nhân viên (Legacy)';
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

            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            {isMobile && <TableCell width="40px" />}
                            <TableCell sx={{ fontWeight: 700 }}>Tên</TableCell>
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Công ty</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Vai trò</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>}
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
                            <TableRow><TableCell colSpan={isMobile ? 3 : (hasPermission('organization:view') ? 6 : 5)} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : employees.length === 0 ? (
                            <TableRow><TableCell colSpan={isMobile ? 3 : (hasPermission('organization:view') ? 6 : 5)} align="center" sx={{ py: 3 }}>Không tìm thấy người dùng</TableCell></TableRow>
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
