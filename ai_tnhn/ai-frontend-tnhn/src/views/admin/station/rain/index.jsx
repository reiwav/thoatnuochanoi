import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Button, Grid, TextField, Table, TableBody, Box, Stack,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, TablePagination, Typography, Chip, Tooltip,
    useTheme, useMediaQuery, Card, CardContent, Divider, TableSortLabel
} from '@mui/material';
import PermissionGuard from 'ui-component/PermissionGuard';
import ConfirmDialog from 'ui-component/ConfirmDialog';
import { IconTrash, IconPlus, IconEdit, IconSearch } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import stationApi from 'api/station';
import organizationApi from 'api/organization';
import RainDialog from './RainDialog';
import useAuthStore from 'store/useAuthStore';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import { getDataArray } from 'utils/apiHelper';

// Sub-components
import StationMobileCard from './components/StationMobileCard';
import StationDesktopRow from './components/StationDesktopRow';

const StationRainList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user, isCompany, isSuperAdmin, hasPermission, permissions } = useAuthStore();
    const canCreate = hasPermission('rain:create');
    const canEdit = hasPermission('rain:edit');
    const canDelete = hasPermission('rain:delete');

    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [organizations, setOrganizations] = useState({ primary: [], shared: [] });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [sortOrder, setSortOrder] = useState('default');

    // Khởi tạo bộ lọc đơn vị thông minh: Tránh việc gọi API 2 lần (1 lần không có org_id, 1 lần có org_id do OrganizationSelect ép vào)
    const isCompanyLevel = isCompany || user?.role === 'super_admin';
    const initialOrgId = '';
    
    const [filterInputs, setFilterInputs] = useState({ search: '', active: '', org_id: initialOrgId });
    const [params, setParams] = useState({ search: '', active: '', org_id: initialOrgId });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStation, setEditingStation] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [stRes, orgRes] = await Promise.all([
                stationApi.rain.getAll({ ...params, page: page + 1, per_page: rowsPerPage }),
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
        } finally {
            setLoading(false);
        }
    };

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
    }, [page, rowsPerPage, params]);

    const handleOpenCreate = () => { setEditingStation(null); setDialogOpen(true); };
    const handleOpenEdit = (station) => { setEditingStation(station); setDialogOpen(true); };

    const handleDelete = (item) => {
        setDeletingItem(item);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingItem) return;
        setLoading(true);
        try {
            await stationApi.rain.delete(deletingItem.id);
            toast.success('Xóa thành công');
            setConfirmOpen(false);
            setDeletingItem(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa trạm');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        try {
            const res = editingStation
                ? await stationApi.rain.update(editingStation.id, values)
                : await stationApi.rain.create(values);
            
            if (res) {
                toast.success(editingStation ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadData();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    const getOrgName = (orgId) => {
        const org = (organizations.shared || []).find(o => o.id === orgId);
        return org ? org.name : '';
    };

    const organizationNamesMap = (organizations.shared || []).reduce((acc, org) => {
        acc[org.id] = org.name;
        return acc;
    }, {});

    const sortedStations = useMemo(() => {
        if (sortOrder === 'default' || !sortOrder) return stations;
        return [...stations].sort((a, b) => {
            const weightA = a.TrongSoBaoCao || 0;
            const weightB = b.TrongSoBaoCao || 0;
            return sortOrder === 'asc' ? weightA - weightB : weightB - weightA;
        });
    }, [stations, sortOrder]);

    return (
        <PermissionGuard permission="rain:view" fallback={<Box sx={{ p: 3, textAlign: 'center' }}><Typography color="error" variant="h4">Bạn không có quyền truy cập vùng dữ liệu này.</Typography></Box>}>
        <MainCard
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>QUẢN LÝ TRẠM ĐO MƯA</Typography>
                </Box>
            }
            secondary={
                <PermissionGuard permission="rain:create">
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
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={32} color="secondary" /></Box>
                ) : stations.length === 0 ? (
                    <Typography align="center" sx={{ py: 3, color: 'text.secondary' }}>Không tìm thấy trạm</Typography>
                ) : (
                    stations.map((row) => (
                        <StationMobileCard
                            key={row.id}
                            row={row}
                            handleOpenEdit={handleOpenEdit}
                            handleDelete={() => handleDelete(row)}
                            canEdit={canEdit && (isSuperAdmin || isCompany || user?.org_id === row.org_id)}
                            canDelete={canDelete && (isSuperAdmin || isCompany || user?.org_id === row.org_id)}
                            organizationName={getOrgName(row.org_id)}
                        />
                    ))
                )}
            </Box>

            {/* Desktop Table View */}
            <TableContainer component={Paper} elevation={0} sx={{ 
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
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Tên trạm</TableCell>
                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Địa chỉ</TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Thuộc</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Xí nghiệp quản lý</TableCell>
                            <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Xí nghiệp phối hợp</TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Ưu tiên</TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>
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
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Ngưỡng</TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Trạng thái</TableCell>
                            {(canEdit || canDelete) && <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Thao tác</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : sortedStations.length === 0 ? (
                            <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3 }}>Không tìm thấy trạm</TableCell></TableRow>
                        ) : (
                            sortedStations.map((row) => (
                                <StationDesktopRow
                                    key={row.id}
                                    row={row}
                                    handleOpenEdit={handleOpenEdit}
                                    handleDelete={() => handleDelete(row)}
                                    canEdit={canEdit && (isSuperAdmin || isCompany || user?.org_id === row.org_id)}
                                    canDelete={canDelete && (isSuperAdmin || isCompany || user?.org_id === row.org_id)}
                                    organizationName={getOrgName(row.org_id)}
                                    organizationNamesMap={organizationNamesMap}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]} component="div" count={totalItems}
                    rowsPerPage={rowsPerPage} page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    labelRowsPerPage={isMobile ? "" : "Số dòng:"}
                />
            </Box>

            <RainDialog
                open={dialogOpen} onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit} station={editingStation} isEdit={!!editingStation}
                organizations={organizations}
            />

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                loading={loading}
                itemName={deletingItem?.TenTram}
                title="Xóa trạm đo mưa"
                description="Bạn có chắc muốn xóa trạm đo mưa này? Dữ liệu lịch sử mưa cũng sẽ bị gỡ bỏ."
            />
        </MainCard>
        </PermissionGuard>
    );
};

export default StationRainList;
