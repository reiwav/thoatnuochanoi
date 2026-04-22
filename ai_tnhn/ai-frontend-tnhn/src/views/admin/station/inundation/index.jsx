import React, { useState, useEffect } from 'react';
import {
    Button, Stack, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, Typography, Chip, Tooltip, Box,
    Collapse, useTheme, useMediaQuery, Grid, Card, CardContent, Divider
} from '@mui/material';
import PermissionGuard from 'ui-component/PermissionGuard';
import ConfirmDialog from 'ui-component/ConfirmDialog';
import { IconTrash, IconPlus, IconEdit, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import stationApi from 'api/station';
import organizationApi from 'api/organization';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import InundationDialog from './InundationDialog';
import useAuthStore from 'store/useAuthStore';

// Shared Components
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
                <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                    <IconTrash size={20} />
                </IconButton>
            </Tooltip>
        )}
    </Stack>
);

const InundationMobileCard = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete }) => {
    const [open, setOpen] = useState(false);
    return (
        <Card sx={{ mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>{row.name}</Typography>
                        <Chip
                            label={row.active ? 'Hoạt động' : 'Ngừng'}
                            size="small"
                            color={row.active ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 800, height: 24 }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>ĐƠN VỊ QUẢN LÝ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>{row.org_name || '-'}</Typography>
                    </Box>

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '60%' }}>{row.address}</Typography>
                        <ActionButtons 
                            row={row} 
                            canEdit={canEdit} 
                            canDelete={canDelete} 
                            handleOpenEdit={handleOpenEdit} 
                            handleDelete={handleDelete} 
                        />
                    </Box>

                    <Button 
                        fullWidth size="small" 
                        variant="light" 
                        onClick={() => setOpen(!open)}
                        endIcon={open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                        sx={{ borderRadius: '8px', bgcolor: 'grey.50', py: 0.8, fontWeight: 700 }}
                    >
                        {open ? 'Ẩn tọa độ' : 'Xem tọa độ'}
                    </Button>

                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{row.lat}, {row.lng}</Typography>
                        </Box>
                    </Collapse>
                </Stack>
            </CardContent>
        </Card>
    );
};

const InundationDesktopRow = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete, organizationNamesMap }) => (
    <TableRow hover>
        <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{row.name}</Typography>
        </TableCell>
        <TableCell>
            <Typography variant="body2" color="textSecondary">{row.address || '-'}</Typography>
        </TableCell>
        <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>{row.org_name || '-'}</Typography>
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                {row.share_all ? 'Tất cả xí nghiệp' : (row.shared_org_ids?.map(id => organizationNamesMap[id]).filter(n => n).join(', ') || '-')}
            </Typography>
        </TableCell>
        <TableCell>
            <Chip label={row.active ? 'Hoạt động' : 'Ngừng'}
                color={row.active ? 'success' : 'default'} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem', height: 24 }} />
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

const StationInundationList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { user, isCompany, hasPermission } = useAuthStore();
    const canCreate = hasPermission('inundation:create');
    const canEdit = hasPermission('inundation:edit');
    const canDelete = hasPermission('inundation:delete');
    const [loading, setLoading] = useState(false);
    const [points, setPoints] = useState([]);
    const [organizations, setOrganizations] = useState({ primary: [], shared: [] });

    const organizationNamesMap = (organizations.shared || []).reduce((acc, org) => {
        acc[org.id] = org.name;
        return acc;
    }, {});

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);

    const [searchFilter, setSearchFilter] = useState('');
    
    // Khởi tạo orgFilter thông minh: Nếu không phải cấp Công ty/Super Admin thì mặc định gán theo org_id của user
    // Điều này giúp tránh việc mount với giá trị '' rồi bị OrganizationSelect ép về org_id (gây gọi API 2 lần)
    const isCompanyLevel = isCompany || user?.role === 'super_admin';
    const initialOrgFilter = (!isCompanyLevel && user?.org_id) ? user.org_id : '';
    const [orgFilter, setOrgFilter] = useState(initialOrgFilter);

    const loadPoints = async () => {
        setLoading(true);
        try {
            const params = {};
            if (orgFilter) params.org_id = orgFilter;

            const data = await stationApi.inundation.getAll(params);
            if (data) {
                let pointsData = Array.isArray(data) ? data : (data.data || []);
                if (searchFilter) {
                    const q = searchFilter.toLowerCase();
                    pointsData = pointsData.filter(p =>
                        p.name?.toLowerCase().includes(q) ||
                        p.address?.toLowerCase().includes(q)
                    );
                }
                const sortedData = [...pointsData].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
                setPoints(sortedData);
            } else {
                setPoints([]);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách điểm ngập:', err);
            setPoints([]);
        } finally {
            setLoading(false);
        }
    };

    const loadOrganizations = async () => {
        try {
            const data = await organizationApi.getSelectionList();
            if (data) {
                setOrganizations(data || { primary: [], shared: [] });
            }
        } catch (err) {
            console.error('Lỗi tải danh sách đơn vị:', err);
        }
    };

    useEffect(() => {
        loadPoints();
    }, [orgFilter, searchFilter]);

    useEffect(() => {
        loadOrganizations();
    }, []);

    const handleOpenCreate = () => { setEditingPoint(null); setDialogOpen(true); };
    const handleOpenEdit = (point) => { setEditingPoint(point); setDialogOpen(true); };

    const handleDelete = (item) => {
        setDeletingItem(item);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingItem) return;
        setLoading(true);
        try {
            await stationApi.inundation.delete(deletingItem.id);
            toast.success('Xóa thành công');
            setPoints(prev => prev.filter(p => p.id !== deletingItem.id));
            setConfirmOpen(false);
            setDeletingItem(null);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa điểm ngập');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        try {
            const payload = {
                name: values.TenTram,
                address: values.DiaChi,
                lat: values.Lat,
                lng: values.Lng,
                active: values.Active,
                org_id: values.org_id,
                shared_org_ids: values.shared_org_ids,
                share_all: values.share_all
            };
            const res = editingPoint
                ? await stationApi.inundation.update(editingPoint.id, payload)
                : await stationApi.inundation.create(payload);
            
            if (res) {
                toast.success(editingPoint ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadPoints();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

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
                            handleDelete={() => handleDelete(row)}
                            canEdit={canEdit && (isCompany || user?.org_id === row.org_id)}
                            canDelete={canDelete && (isCompany || user?.org_id === row.org_id)}
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
                overflow: 'hidden'
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
                                    handleDelete={() => handleDelete(row)}
                                    canEdit={canEdit && (isCompany || user?.org_id === row.org_id)}
                                    canDelete={canDelete && (isCompany || user?.org_id === row.org_id)}
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
