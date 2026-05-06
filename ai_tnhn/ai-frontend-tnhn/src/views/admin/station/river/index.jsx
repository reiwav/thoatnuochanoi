import { useState, useEffect, useRef } from 'react';
import {
    Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, TablePagination, Typography, Chip, Tooltip,
    useTheme, useMediaQuery, Box, Stack, Card, CardContent, Divider
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconSearch } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from 'ui-component/ConfirmDialog';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import stationApi from 'api/station';
import organizationApi from 'api/organization';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import RiverDialog from './RiverDialog';
import useAuthStore from 'store/useAuthStore';
import { getDataArray } from 'utils/apiHelper';
import PermissionGuard from 'ui-component/PermissionGuard';

// Shared Components for Clean Architecture
const StatusChip = ({ active }) => (
    <Chip
        label={active ? 'Hoạt động' : 'Ngừng'}
        color={active ? 'success' : 'default'}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 800, fontSize: '0.75rem', height: 24 }}
    />
);

const ActionButtons = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete }) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        {canEdit && (
            <Tooltip title="Chỉnh sửa">
                <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                    <IconEdit size={20} />
                </IconButton>
            </Tooltip>
        )}
        {canDelete && (
            <Tooltip title="Xóa">
                <IconButton color="error" size="small" onClick={() => handleDelete(row.id || row.Id)}>
                    <IconTrash size={20} />
                </IconButton>
            </Tooltip>
        )}
    </Stack>
);

const StationMobileCard = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete, organizationName }) => (
    <Card sx={{ mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>{row.TenTram}</Typography>
                    <StatusChip active={row.Active} />
                </Box>
                
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>ĐƠN VỊ QUẢN LÝ</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>{organizationName || '-'}</Typography>
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>ƯU TIÊN</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.ThuTu || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>MÃ LOẠI</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.Loai || '-'}</Typography>
                    </Grid>
                </Grid>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{row.DiaChi}</Typography>
                    </Box>
                    <ActionButtons 
                        row={row} 
                        canEdit={canEdit} 
                        canDelete={canDelete} 
                        handleOpenEdit={handleOpenEdit} 
                        handleDelete={handleDelete} 
                    />
                </Box>
            </Stack>
        </CardContent>
    </Card>
);

const StationDesktopRow = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete, organizationName, organizationNamesMap }) => (
    <TableRow hover>
        <TableCell sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'primary.dark' }}>{row.TenTram}</TableCell>
        <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Tooltip title={row.TenTramHTML || ''} placement="top">
                <span>{row.TenTramHTML || '-'}</span>
            </Tooltip>
        </TableCell>
        <TableCell sx={{ fontSize: '0.95rem', fontWeight: 700 }}>{row.OldID || row.Id || '-'}</TableCell>
        <TableCell sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{organizationName || '-'}</TableCell>
        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontSize: '0.85rem' }}>
            {row.share_all ? 'Tất cả xí nghiệp' : (row.shared_org_ids?.map(id => organizationNamesMap[id]).filter(n => n).join(', ') || '-')}
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: '1rem' }}>{row.Loai}</TableCell>
        <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' }, fontSize: '0.95rem' }}>{row.DiaChi}</TableCell>
        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '1rem', fontWeight: 700 }}>{row.ThuTu || 0}</TableCell>
        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '1rem', fontWeight: 700 }}>{row.TrongSoBaoCao || 0}</TableCell>
        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '1rem', fontWeight: 700 }}>{row.NguongCanhBao || '-'}</TableCell>
        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
            <StatusChip active={row.Active} />
        </TableCell>
        {(canEdit || canDelete) && (
            <TableCell align="right">
                <ActionButtons 
                    row={row} 
                    canEdit={canEdit} 
                    canDelete={canDelete} 
                    handleOpenEdit={handleOpenEdit} 
                    handleDelete={handleDelete} 
                />
            </TableCell>
        )}
    </TableRow>
);

const StationRiverList = () => {
    const { user, isCompany, isSuperAdmin, hasPermission, permissions } = useAuthStore();
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
                stationApi.river.getAll({ ...params, page: page + 1, per_page: rowsPerPage }),
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
            await stationApi.river.delete(deletingItem.id);
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
                ? await stationApi.river.update(editingStation.id, values)
                : await stationApi.river.create(values);
            
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
        const org = organizations.shared?.find(o => o.id === orgId);
        return org ? org.name : '';
    };

    const organizationNamesMap = (organizations.shared || []).reduce((acc, org) => {
        acc[org.id] = org.name;
        return acc;
    }, {});

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <PermissionGuard permission="water:view" fallback={<Box sx={{ p: 3, textAlign: 'center' }}><Typography color="error" variant="h4">Bạn không có quyền truy cập vùng dữ liệu này.</Typography></Box>}>
        <MainCard
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>QUẢN LÝ TRẠM ĐO MỰC NƯỚC SÔNG</Typography>
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
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Trạm HTML</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Old ID</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Xí nghiệp quản lý</TableCell>
                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Xí nghiệp phối hợp</TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Loại</TableCell>
                            <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Địa chỉ</TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Ưu tiên</TableCell>
                            <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Trọng số</TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Ngưỡng</TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontWeight: 800, fontSize: '0.95rem' }}>Trạng thái</TableCell>
                            {(canEdit || canDelete) && <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Thao tác</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : stations.length === 0 ? (
                            <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3 }}>Không tìm thấy trạm</TableCell></TableRow>
                        ) : (
                            stations.map((row) => (
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

            <RiverDialog
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
                title="Xóa trạm đo mực nước"
                description="Bạn có chắc muốn xóa trạm đo mực nước sông này? Dữ liệu lịch sử sẽ bị gỡ bỏ."
            />
        </MainCard>
        </PermissionGuard>
    );
};

export default StationRiverList;
