import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, TablePagination, Typography,
    useTheme, useMediaQuery, Box, InputAdornment, Stack
} from '@mui/material';
import PermissionGuard from 'ui-component/PermissionGuard';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import stationApi from 'api/station';
import organizationApi from 'api/organization';
import LakeDialog from './LakeDialog';
import useAuthStore from 'store/useAuthStore';
import { getDataArray } from 'utils/apiHelper';

// Sub-components
import StationMobileCard from './components/StationMobileCard';
import StationDesktopRow from './components/StationDesktopRow';

const StationLakeList = () => {
    const { user, isCompany, hasPermission } = useAuthStore();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const canCreate = hasPermission('water:create');
    const canEdit = hasPermission('water:edit');
    const canDelete = hasPermission('water:delete');

    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [organizations, setOrganizations] = useState({ primary: [], shared: [] });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    
    // Khởi tạo bộ lọc đơn vị thông minh: Tránh việc gọi API 2 lần (1 lần không có org_id, 1 lần có org_id do OrganizationSelect ép vào)
    const isCompanyLevel = isCompany || user?.role === 'super_admin';
    const initialOrgId = (!isCompanyLevel && user?.org_id) ? user.org_id : '';

    const [filterInputs, setFilterInputs] = useState({ search: '', active: '', org_id: initialOrgId });
    const [params, setParams] = useState({ search: '', active: '', org_id: initialOrgId });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStation, setEditingStation] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [stRes, orgRes] = await Promise.all([
                stationApi.lake.getAll({ ...params, page: page + 1, per_page: rowsPerPage }),
                organizationApi.getSelectionList()
            ]);

            if (stRes) {
                const stationList = stRes.tram || getDataArray(stRes);
                setStations(stationList);
                setTotalItems(stRes.total || stationList.length);
            }

            if (orgRes) {
                setOrganizations(orgRes || { primary: [], shared: [] });
            }
        } catch (err) {
            console.error('Lỗi tải dữ liệu:', err);
            toast.error('Không thể tải danh sách trạm');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, params]);

    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            setParams(filterInputs);
            setPage(0);
        }, 500);
        return () => clearTimeout(timer);
    }, [filterInputs]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenCreate = useCallback(() => { 
        setEditingStation(null); 
        setDialogOpen(true); 
    }, []);

    const handleOpenEdit = useCallback((station) => { 
        setEditingStation(station); 
        setDialogOpen(true); 
    }, []);

    const handleDelete = useCallback(async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa trạm này?')) return;
        try {
            await stationApi.lake.delete(id);
            toast.success('Xóa thành công');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa trạm');
        }
    }, [loadData]);

    const handleSubmit = useCallback(async (values) => {
        try {
            const res = editingStation
                ? await stationApi.lake.update(editingStation.id, values)
                : await stationApi.lake.create(values);
            
            if (res) {
                toast.success(editingStation ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadData();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    }, [editingStation, loadData]);

    const organizationNamesMap = useMemo(() => {
        return (organizations.shared || []).reduce((acc, org) => {
            acc[org.id] = org.name;
            return acc;
        }, {});
    }, [organizations.shared]);

    const getOrgName = useCallback((orgId) => {
        return organizationNamesMap[orgId] || '';
    }, [organizationNamesMap]);

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
                                fontSize: '0.875rem', 
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
                            handleDelete={handleDelete}
                            canEdit={canEdit && (isCompany || user?.org_id === row.org_id)}
                            canDelete={canDelete && (isCompany || user?.org_id === row.org_id)}
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
                overflow: 'hidden'
            }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Tên trạm</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Xí nghiệp quản lý</TableCell>
                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontWeight: 800, fontSize: '0.9rem' }}>Xí nghiệp phối hợp</TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontWeight: 800, fontSize: '0.9rem' }}>Loại</TableCell>
                            <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' }, fontWeight: 800, fontSize: '0.9rem' }}>Địa chỉ</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Thứ tự</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Trọng số</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Ngưỡng</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Trạng thái</TableCell>
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
                        ) : stations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                                    <Typography variant="h4" color="text.secondary" fontWeight={600}>Không tìm thấy trạm</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            stations.map((row) => (
                                <StationDesktopRow
                                    key={row.id}
                                    row={row}
                                    handleOpenEdit={handleOpenEdit}
                                    handleDelete={handleDelete}
                                    canEdit={canEdit && (isCompany || user?.org_id === row.org_id)}
                                    canDelete={canDelete && (isCompany || user?.org_id === row.org_id)}
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
        </MainCard>
        </PermissionGuard>
    );
};

export default StationLakeList;
