import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Button, Grid, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, TablePagination, Typography, Chip, Tooltip, Stack,
    Collapse, useTheme, useMediaQuery, MenuItem
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconSearch, IconChevronDown, IconChevronUp, IconMapPin, IconCalendar, IconUser, IconAlertTriangle } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import emergencyConstructionApi from 'api/emergencyConstruction';
import ConstructionDialog from './ConstructionDialog';
import organizationApi from 'api/organization';
import useAuthStore from 'store/useAuthStore';

const CollapsibleConstructionRow = ({ row, handleOpenEdit, handleDelete, orgs, getStatusChip, isMobile, userRole, navigate, hasPermission }) => {
    const [open, setOpen] = useState(false);

    if (isMobile) {
        return (
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.dark', lineHeight: 1.2, mb: 1 }}>{row.name}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {getStatusChip(row.status)}
                                <Chip label={orgs[row.org_id] || 'Đơn vị quản lý'} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.75rem' }} />
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={() => setOpen(!open)} sx={{ mt: -0.5, mr: -0.5 }}>
                            {open ? <IconChevronUp size={24} /> : <IconChevronDown size={24} />}
                        </IconButton>
                    </Stack>

                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>VỊ TRÍ:</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <IconMapPin size={16} /> {row.location || '-'}
                                </Typography>
                            </Box>
                            
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>THỜI GIAN:</Typography>
                                <Stack direction="row" spacing={2}>
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">Bắt đầu:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(row.start_date * 1000).toLocaleDateString('vi-VN')}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">Kết thúc:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(row.end_date * 1000).toLocaleDateString('vi-VN')}</Typography>
                                    </Box>
                                </Stack>
                            </Box>


                            <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                {hasPermission('emergency:edit') && (
                                    <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}><IconEdit size={20} /></IconButton>
                                )}
                                {hasPermission('emergency:edit') && (
                                    <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}><IconTrash size={20} /></IconButton>
                                )}
                            </Stack>
                        </Box>
                    </Collapse>
                </Stack>
            </Box>
        );
    }

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& .MuiTableCell-root': { borderBottom: 'none' } }}>
                <TableCell sx={{ width: 40 }}>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
                <TableCell>{orgs[row.org_id] || row.org_id}</TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(row.start_date * 1000).toLocaleDateString('vi-VN')}</Typography>
                    <Typography variant="caption" color="textSecondary">Đến: {new Date(row.end_date * 1000).toLocaleDateString('vi-VN')}</Typography>
                </TableCell>
                <TableCell align="center">{getStatusChip(row.status)}</TableCell>
                <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {hasPermission('emergency:edit') && (
                            <Tooltip title="Chỉnh sửa"><IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}><IconEdit size={18} /></IconButton></Tooltip>
                        )}
                        {hasPermission('emergency:edit') && (
                            <Tooltip title="Xóa"><IconButton color="error" size="small" onClick={() => handleDelete(row.id)}><IconTrash size={18} /></IconButton></Tooltip>
                        )}
                    </Stack>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ m: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>VỊ TRÍ THI CÔNG:</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.dark' }}>{row.location || 'Chưa cập nhật'}</Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>MÔ TẢ CÔNG VIỆC:</Typography>
                                    <Typography variant="body2">{row.description || 'Không có mô tả'}</Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

const ConstructionList = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // Get auth state from Zustand
    const { role: userRole, user: userInfo, hasPermission } = useAuthStore();
    const userOrgId = userInfo?.org_id || '';
    
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [filterInputs, setFilterInputs] = useState({ name: '', status: '' });
    const [params, setParams] = useState({ name: '', status: '' });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [orgs, setOrgs] = useState({});

    const fetchOrgs = async () => {
        try {
            const res = await organizationApi.getAll({ per_page: 1000 });
            if (res.data?.status === 'success') {
                const orgMap = {};
                res.data.data?.data?.forEach(o => {
                    orgMap[o.id] = o.name;
                });
                setOrgs(orgMap);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách công ty:', err);
        }
    };

    const loadItems = async () => {
        setLoading(true);
        try {
            const res = await emergencyConstructionApi.getAll({ ...params, page: page + 1, per_page: rowsPerPage });
            if (res.data?.status === 'success') {
                setItems(res.data.data?.data || []);
                setTotalItems(res.data.data?.total || 0);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách công trình:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, []);

    useEffect(() => {
        loadItems();
    }, [page, rowsPerPage, params]);

    const handleSearch = () => { setPage(0); setParams(filterInputs); };
    const handleOpenCreate = () => { setEditingItem(null); setDialogOpen(true); };
    const handleOpenEdit = (item) => { setEditingItem(item); setDialogOpen(true); };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa công trình này?')) return;
        try {
            const res = await emergencyConstructionApi.delete(id);
            if (res.data?.status === 'success') { toast.success('Xóa thành công'); loadItems(); }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa công trình');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const res = editingItem
                ? await emergencyConstructionApi.update(editingItem.id, values)
                : await emergencyConstructionApi.create(values);
            if (res.data?.status === 'success') {
                toast.success(editingItem ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadItems();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    const getStatusChip = (status) => {
        const config = {
            planned: { label: 'Dự kiến', color: 'default' },
            ongoing: { label: 'Đang thi công', color: 'warning' },
            completed: { label: 'Hoàn thành', color: 'success' },
            suspended: { label: 'Tạm dừng', color: 'error' }
        };
        const s = config[status] || config.planned;
        return <Chip label={s.label} color={s.color} size="small" variant="outlined" />;
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                {hasPermission('emergency:edit') && (
                    <Button variant="contained" color="secondary" startIcon={<IconPlus size={18} />} onClick={handleOpenCreate}>
                        Thêm công trình
                    </Button>
                )}
            </Stack>

            <Stack direction={isMobile ? "column" : "row"} spacing={1.5} sx={{ mb: 3 }}>
                <TextField 
                    fullWidth 
                    size={isMobile ? "medium" : "small"} 
                    placeholder="Tìm tên công trình, địa chỉ..." 
                    value={filterInputs.name}
                    onChange={(e) => setFilterInputs({ ...filterInputs, name: e.target.value })}
                    InputProps={{ 
                        startAdornment: <IconSearch size={20} sx={{ color: 'text.disabled', mr: 1, ml: 0.5 }} />,
                        sx: { borderRadius: 3, fontWeight: 600 }
                    }}
                />
                <TextField
                    select
                    fullWidth
                    size={isMobile ? "medium" : "small"}
                    label="Trạng thái"
                    value={filterInputs.status}
                    onChange={(e) => setFilterInputs({ ...filterInputs, status: e.target.value })}
                    InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }}
                    sx={{ maxWidth: isMobile ? '100%' : 200 }}
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="planned">Dự kiến</MenuItem>
                    <MenuItem value="ongoing">Đang thi công</MenuItem>
                    <MenuItem value="completed">Hoàn thành</MenuItem>
                    <MenuItem value="suspended">Tạm dừng</MenuItem>
                </TextField>
                <Button 
                    variant="contained" color="primary" sx={{ borderRadius: 3, px: 4, fontWeight: 700, height: isMobile ? 48 : 40 }}
                    onClick={handleSearch}
                >
                    Lọc
                </Button>
            </Stack>

            {isMobile ? (
                <Stack spacing={2} sx={{ mb: 4 }}>
                    {loading ? [1, 2, 3].map(i => <Box key={i} sx={{ height: 140, bgcolor: 'grey.100', borderRadius: 3, animation: 'pulse 1.5s infinite' }} />) :
                        items.length === 0 ? <Typography align="center" color="textSecondary" sx={{ py: 4 }}>Không tìm thấy công trình nào</Typography> :
                            items.map((row) => (
                                <CollapsibleConstructionRow
                                    key={row.id}
                                    row={row}
                                    handleOpenEdit={handleOpenEdit}
                                    handleDelete={handleDelete}
                                    orgs={orgs}
                                    getStatusChip={getStatusChip}
                                    isMobile={isMobile}
                                    userRole={userRole}
                                    navigate={navigate}
                                    hasPermission={hasPermission}
                                />
                            ))
                    }
                </Stack>
            ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell sx={{ fontWeight: 800 }}>Tên công trình</TableCell>
                                <TableCell sx={{ fontWeight: 800, width: 250 }}>Đơn vị quản lý</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>Thời gian</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800 }}>Trạng thái</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, width: 200 }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                            ) : items.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>Không tìm thấy công trình</TableCell></TableRow>
                            ) : (
                                items.map((row) => (
                                    <CollapsibleConstructionRow
                                        key={row.id}
                                        row={row}
                                        handleOpenEdit={handleOpenEdit}
                                        handleDelete={handleDelete}
                                        orgs={orgs}
                                        getStatusChip={getStatusChip}
                                        isMobile={isMobile}
                                        navigate={navigate}
                                        hasPermission={hasPermission}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <ConstructionDialog
                open={dialogOpen} onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit} item={editingItem} isEdit={!!editingItem}
                defaultOrgId={userOrgId}
            />
        </Box>
    );
};

export default ConstructionList;
