import React, { useState, useEffect } from 'react';
import {  } from 'react-router-dom';
import {
    Button, Stack, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, Typography, Chip, Tooltip, Box,
    MenuItem, Collapse, useTheme, useMediaQuery, Grid
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import stationApi from 'api/station';
import organizationApi from 'api/organization';
import StationDialog from './StationDialog';
import useAuthStore from 'store/useAuthStore';

const CollapsibleStationRow = ({ row, handleOpenEdit, handleDelete, isMobile, canEdit, canDelete, organizationNamesMap }) => {
    const [open, setOpen] = useState(false);
    return (
        <React.Fragment>
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
                <TableCell sx={{ width: 40, p: { xs: 1, md: 2 } }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.dark', fontSize: { xs: '0.875rem', md: 'inherit' } }}>{row.name}</Typography>
                    {isMobile && (
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main', mt: 0.5 }}>
                            {row.org_name || '-'}
                        </Typography>
                    )}
                </TableCell>
                {!isMobile && (
                    <>
                        <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                                {row.org_name || '-'}
                            </Typography>
                        </TableCell>
                        <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                {row.shared_org_ids?.map(id => organizationNamesMap[id]).filter(n => n).join(', ') || '-'}
                            </Typography>
                        </TableCell>
                        <TableCell>
                            <Chip label={row.active ? 'Hoạt động' : 'Ngừng'}
                                color={row.active ? 'success' : 'default'} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem', height: 24 }} />
                        </TableCell>
                    </>
                )}
                {!isMobile && (canEdit || canDelete) && (
                    <TableCell align="right" sx={{ p: { xs: 1, md: 2 } }}>
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
                    </TableCell>
                )}
            </TableRow>
            <TableRow>
                <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', paddingBottom: 0, paddingTop: 0 }} colSpan={isMobile ? 2 : 5}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: { xs: 1, md: 2 }, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 700, color: 'primary.main', mb: 2, fontSize: { xs: '0.875rem', md: 'inherit' } }}>
                                {row.address}
                            </Typography>
                            <Stack spacing={1.5}>
                                {isMobile && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                        <Chip label={row.active ? 'Hoạt động' : 'Ngừng'}
                                            color={row.active ? 'success' : 'default'} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.75rem', height: 24 }} />
                                    </Stack>
                                )}
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="text.secondary">Tọa độ:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.lat}, {row.lng}</Typography>
                                    </Grid>
                                </Grid>
                                {isMobile && (canEdit || canDelete) && (
                                    <Box sx={{ mt: 1, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                        {canEdit && <Button size="small" color="primary" variant="contained" startIcon={<IconEdit size={16} />} onClick={() => handleOpenEdit(row)}>Chỉnh sửa</Button>}
                                        {canDelete && <Button size="small" color="error" variant="outlined" startIcon={<IconTrash size={16} />} onClick={() => handleDelete(row.id)}>Xóa</Button>}
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

const StationInundationList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { hasPermission } = useAuthStore();
    const canCreate = hasPermission('inundation:create');
    const canEdit = hasPermission('inundation:edit');
    const canDelete = hasPermission('inundation:delete');
    const [loading, setLoading] = useState(false);
    const [points, setPoints] = useState([]);
    const [organizations, setOrganizations] = useState([]);

    const organizationNamesMap = organizations.reduce((acc, org) => {
        acc[org.id] = org.name;
        return acc;
    }, {});

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);

    const [searchFilter, setSearchFilter] = useState('');
    const [orgFilter, setOrgFilter] = useState('');

    const loadPoints = async () => {
        setLoading(true);
        try {
            const params = {};
            if (orgFilter) params.org_id = orgFilter;
            // The backend GetPointsStatus might not support 'query' yet, 
            // but we can filter locally or update backend if needed.
            // For now let's assume we might update backend or just filter here.

            const res = await stationApi.inundation.getAll(params);
            if (res.data?.status === 'success') {
                let data = Array.isArray(res.data.data) ? res.data.data : [];
                if (searchFilter) {
                    const q = searchFilter.toLowerCase();
                    data = data.filter(p =>
                        p.name?.toLowerCase().includes(q) ||
                        p.address?.toLowerCase().includes(q)
                    );
                }
                // Sort by created_at DESC
                data.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
                setPoints(data);
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
            const res = await organizationApi.getAll({ page: 1, size: 1000 });
            if (res.data?.status === 'success') {
                setOrganizations(res.data.data.data || []);
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

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa điểm ngập này?')) return;
        try {
            const res = await stationApi.inundation.delete(id);
            if (res.data?.status === 'success') { 
                toast.success('Xóa thành công'); 
                setPoints(prev => prev.filter(p => p.id !== id));
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa điểm ngập');
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
                shared_org_ids: values.shared_org_ids
            };
            const res = editingPoint
                ? await stationApi.inundation.update(editingPoint.id, payload)
                : await stationApi.inundation.create(payload);
            if (res.data?.status === 'success') {
                toast.success(editingPoint ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadPoints();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    return (
        <MainCard
            title="Quản lý điểm ngập úng"
            secondary={canCreate && (
                <AnimateButton>
                    <Button variant="contained" color="secondary" startIcon={<IconPlus size={20} />} onClick={handleOpenCreate} sx={{ fontWeight: 700, fontSize: '1rem', px: 2, py: 1 }}>
                        Thêm điểm mới
                    </Button>
                </AnimateButton>
            )}
        >
            <Box sx={{ mb: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                    <TextField
                        placeholder="Tìm tên điểm, địa chỉ..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        size="small"
                        sx={{ width: { xs: '100%', sm: 250 } }}
                    />
                    <TextField
                        select
                        label="Đơn vị quản lý"
                        value={orgFilter}
                        onChange={(e) => setOrgFilter(e.target.value)}
                        size="small"
                        sx={{ width: { xs: '100%', sm: 200 } }}
                    >
                        <MenuItem value="">Tất cả đơn vị</MenuItem>
                        {organizations.map((org) => (
                            <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </Box>

            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', '& .MuiTableCell-root': { fontSize: { xs: '0.875rem' } } }}>
                <Table sx={{ minWidth: isMobile ? 300 : 800 }}>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ width: 40 }} />
                            <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Tên điểm</TableCell>
                            {!isMobile && (
                                <>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Đơn vị quản lý</TableCell>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Đơn vị phối hợp</TableCell>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Trạng thái</TableCell>
                                    {(canEdit || canDelete) && <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>Thao tác</TableCell>}
                                </>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={isMobile ? 2 : 6} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                        ) : points.length === 0 ? (
                            <TableRow><TableCell colSpan={isMobile ? 2 : 6} align="center" sx={{ py: 3 }}>Không tìm thấy điểm ngập</TableCell></TableRow>
                        ) : (
                            points.map((row) => (
                                <CollapsibleStationRow
                                    key={row.id}
                                    row={row}
                                    handleOpenEdit={handleOpenEdit}
                                    handleDelete={handleDelete}
                                    isMobile={isMobile}
                                    canEdit={canEdit}
                                    canDelete={canDelete}
                                    organizationNamesMap={organizationNamesMap}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <StationDialog
                open={dialogOpen} onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit} station={editingPoint} isEdit={!!editingPoint}
                type="inundation"
                organizations={organizations}
            />
        </MainCard>
    );
};

export default StationInundationList;
