import React, { useState, useEffect } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { IconEdit, IconTrash, IconPlus, IconHistory, IconChevronDown, IconChevronUp, IconEngine, IconClock, IconUser, IconSearch } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { CircularProgress, Box, Typography, Collapse, Grid, Divider, Paper, useTheme, Chip, useMediaQuery, Card, CardContent, TextField } from '@mui/material';
import pumpingStationApi from 'api/pumpingStation';
import organizationApi from 'api/organization';
import PumpingStationDialog from './PumpingStationDialog';
import PumpingStationHistoryDialog from './PumpingStationHistoryDialog';
import PumpingStationReport from './PumpingStationReport';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import PermissionGuard from 'ui-component/PermissionGuard';
import ConfirmDialog from 'ui-component/ConfirmDialog';
import AnimateButton from 'ui-component/extended/AnimateButton';

// Shared Status Component
const LogStatusChip = ({ report }) => {
    if (!report) return <Chip label="Chưa có dữ liệu" size="small" variant="outlined" sx={{ fontWeight: 700 }} />;
    return (
        <Stack direction="row" spacing={0.5}>
            {report.operating_count > 0 && <Chip label={`Vận hành: ${report.operating_count}`} size="small" color="error" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />}
            {report.maintenance_count > 0 && <Chip label={`Bảo dưỡng: ${report.maintenance_count}`} size="small" color="warning" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />}
        </Stack>
    );
};

const ActionButtons = ({ item, hasPermission, isCompany, user, handleHistory, handleEdit, handleDelete }) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        <Tooltip title="Lịch sử vận hành">
            <IconButton color="info" size="small" onClick={() => handleHistory(item)}>
                <IconHistory size={20} />
            </IconButton>
        </Tooltip>
        {hasPermission('trambom:edit') && (isCompany || user?.org_id === item.org_id) && (
            <Tooltip title="Chỉnh sửa">
                <IconButton color="primary" size="small" onClick={() => handleEdit(item)}>
                    <IconEdit size={20} />
                </IconButton>
            </Tooltip>
        )}
        {hasPermission('trambom:delete') && (isCompany || user?.org_id === item.org_id) && (
            <Tooltip title="Xóa">
                <IconButton color="error" size="small" onClick={() => handleDelete(item)}>
                    <IconTrash size={20} />
                </IconButton>
            </Tooltip>
        )}
    </Stack>
);

const PumpingStationMobileCard = ({ item, getOrgNames, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const [open, setOpen] = useState(false);
    const lastReport = item.last_report;

    return (
        <Card sx={{ mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>{item.name}</Typography>
                        <Chip
                            label={item.is_auto ? 'Tự động' : 'Thủ công'}
                            size="small"
                            color={item.is_auto ? 'primary' : 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 800, height: 24 }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>ĐƠN VỊ QUẢN LÝ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>{getOrgNames(item.org_id) || '-'}</Typography>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>SỐ BƠM</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconEngine size={16} />
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>{item.pump_count}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>TRƯỚC ĐÓ</Typography>
                            <LogStatusChip report={lastReport} />
                        </Grid>
                    </Grid>

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '60%' }}>{item.address}</Typography>
                        <ActionButtons
                            item={item} hasPermission={hasPermission} isCompany={isCompany} user={user}
                            handleHistory={handleHistory} handleEdit={handleEdit} handleDelete={handleDelete}
                        />
                    </Box>

                    {lastReport && (
                        <Button
                            fullWidth size="small"
                            variant="light"
                            onClick={() => setOpen(!open)}
                            endIcon={open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                            sx={{ borderRadius: '8px', bgcolor: 'grey.50', py: 1, fontWeight: 700 }}
                        >
                            {open ? 'Ẩn trạng thái mới nhất' : 'Xem trạng thái mới nhất'}
                        </Button>
                    )}

                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider', mt: 1 }}>
                            <PumpingStatusOverview lastReport={lastReport} />
                        </Box>
                    </Collapse>
                </Stack>
            </CardContent>
        </Card>
    );
};

const PumpingStatusOverview = ({ lastReport }) => {
    if (!lastReport) return null;
    return (
        <Grid container spacing={1.5}>
            <Grid item xs={6}>
                <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'error.light', textAlign: 'center' }}>
                    <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, fontSize: '0.65rem' }}>VẬN HÀNH</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{lastReport.operating_count}</Typography>
                </Box>
            </Grid>
            <Grid item xs={6}>
                <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'success.light', textAlign: 'center' }}>
                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 800, fontSize: '0.65rem' }}>DỪNG</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{lastReport.closed_count}</Typography>
                </Box>
            </Grid>
            <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    {lastReport.note || 'Không có ghi chú'}
                </Typography>
            </Grid>
        </Grid>
    );
};

const PumpingStationDesktopRow = ({ item, index, getOrgNames, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const lastReport = item.last_report;

    return (
        <>
            <TableRow hover sx={{ '& > *': { borderBottom: lastReport ? '1px dashed' : '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ width: 40 }}>
                    {lastReport && (
                        <IconButton size="small" onClick={() => setOpen(!open)}>
                            {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{item.name}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="textSecondary">{item.address || '-'}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.pump_count}</Typography>
                </TableCell>
                <TableCell>
                    <Chip
                        label={item.is_auto ? 'Tự động' : 'Thủ công'}
                        size="small"
                        color={item.is_auto ? 'primary' : 'default'}
                        variant={item.is_auto ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700 }}
                    />
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>{getOrgNames(item.org_id)}</Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                    <Typography variant="body2" color="textSecondary">{item.share_all ? 'Tất cả xí nghiệp' : (getOrgNames(item.shared_org_ids) || '-')}</Typography>
                </TableCell>
                <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.priority || 0}</Typography>
                </TableCell>
                <TableCell align="right">
                    <ActionButtons
                        item={item} hasPermission={hasPermission} isCompany={isCompany} user={user}
                        handleHistory={handleHistory} handleEdit={handleEdit} handleDelete={handleDelete}
                    />
                </TableCell>
            </TableRow>
            {lastReport && (
                <TableRow>
                    <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 0 }} colSpan={9}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ my: 2, mx: 1, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
                                    Trạng thái vận hành mới nhất
                                </Typography>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={3}>
                                        <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'error.light', textAlign: 'center' }}>
                                            <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, display: 'block' }}>VẬN HÀNH</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.operating_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'success.light', textAlign: 'center' }}>
                                            <Typography variant="caption" color="success.main" sx={{ fontWeight: 800, display: 'block' }}>KHÔNG VẬN HÀNH</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.closed_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <Box sx={{
                                            p: 1.5, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: '#FFEB3B', textAlign: 'center',
                                            animation: 'status-blink 1s ease-in-out infinite'
                                        }}>
                                            <style>
                                                {`
                                                @keyframes status-blink {
                                                    0%, 100% { opacity: 1; transform: scale(1); }
                                                    50% { opacity: 0.7; transform: scale(1.02); }
                                                }
                                                `}
                                            </style>
                                            <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', color: '#FBC02D' }}>BẢO DƯỠNG</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.maintenance_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.400', textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block' }}>KO TÍN HIỆU</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.secondary' }}>{lastReport.no_signal_count || 0}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={12} md={7}>
                                                <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.light' }}>
                                                    <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>
                                                        Ghi chú vận hành:
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontStyle: lastReport.note ? 'normal' : 'italic', color: lastReport.note ? 'text.primary' : 'text.disabled', fontWeight: 500 }}>
                                                        {lastReport.note || 'Chưa có ghi chú cho báo cáo này'}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={5}>
                                                <Stack spacing={1} sx={{ pl: { md: 2 } }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <IconClock size={16} color={theme.palette.text.secondary} />
                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                                            Cập nhật: <Box component="span" sx={{ color: 'primary.main' }}>{dayjs(lastReport.timestamp * 1000).format('DD/MM/YYYY HH:mm')}</Box>
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <IconUser size={16} color={theme.palette.text.secondary} />
                                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                                            Người báo cáo: <Box component="span" sx={{ color: 'text.primary' }}>{lastReport.user_name}</Box>
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

const PumpingStationPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user, isCompany, hasPermission } = useAuthStore();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assignedStation, setAssignedStation] = useState(null);
    const [open, setOpen] = useState(false);
    const [openHistory, setOpenHistory] = useState(false);
    const [selected, setSelected] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    const [orgs, setOrgs] = useState({ primary: [], shared: [] });

    // Khởi tạo bộ lọc đơn vị thông minh: Tránh việc gọi API 2 lần
    const isCompanyLevel = isCompany || user?.role === 'super_admin';
    const initialOrgFilter = (!isCompanyLevel && user?.org_id) ? user.org_id : '';
    const [orgFilter, setOrgFilter] = useState(initialOrgFilter);
    const [searchFilter, setSearchFilter] = useState('');
    const [filteredData, setFilteredData] = useState([]);

    const isAdmin = hasPermission('trambom:view');

    const fetchStations = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            if (isAdmin) {
                const res = await pumpingStationApi.list({ per_page: 1000, org_id: orgFilter });
                const list = res?.data || (Array.isArray(res) ? res : []);
                setData(list);
            } else if (user?.assigned_pumping_station_id) {
                const res = await pumpingStationApi.get(user.assigned_pumping_station_id);
                setAssignedStation(res || null);
            }
        } catch (error) {
            console.error('Failed to fetch stations', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchOrgs = async () => {
        try {
            const res = await organizationApi.getSelectionList();
            setOrgs(res || { primary: [], shared: [] });
        } catch (error) {
            console.error('Failed to fetch orgs', error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchStations(true), fetchOrgs()]);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [orgFilter, isAdmin]);

    const NoAccessView = () => (
        <Box sx={{ p: 3 }}>
            {assignedStation ? (
                <PumpingStationReport station={assignedStation} />
            ) : (
                <Typography color="error">Bạn chưa được gán vào trạm bơm nào. Vui lòng liên hệ quản lý.</Typography>
            )}
        </Box>
    );

    useEffect(() => {
        if (!Array.isArray(data)) {
            setFilteredData([]);
            return;
        }
        const q = searchFilter.toLowerCase();
        const filtered = data.filter(item =>
            item.name?.toLowerCase().includes(q) ||
            item.address?.toLowerCase().includes(q)
        );
        setFilteredData(filtered);
    }, [data, searchFilter]);

    const handleAdd = () => {
        setSelected(null);
        setOpen(true);
    };

    const handleEdit = (item) => {
        setSelected(item);
        setOpen(true);
    };

    const handleHistory = (item) => {
        setSelected(item);
        setOpenHistory(true);
    };

    const handleDelete = (item) => {
        setDeletingItem(item);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingItem) return;
        setLoading(true);
        try {
            await pumpingStationApi.delete(deletingItem.id);
            setConfirmOpen(false);
            setDeletingItem(null);
            loadData();
            toast.success('Xóa thành công');
        } catch (error) {
            toast.error('Xóa thất bại');
        } finally {
            setLoading(false);
        }
    };

    const getOrgNames = (ids) => {
        if (!ids) return '';
        const idList = Array.isArray(ids) ? ids : [ids];
        const allOrgs = [...(orgs.primary || []), ...(orgs.shared || [])];
        return idList
            .map((id) => allOrgs.find((o) => o.id === id)?.name)
            .filter((name) => !!name)
            .join(', ');
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;

    return (
        <PermissionGuard permission="trambom:view" fallback={<NoAccessView />}>
            <MainCard
                title={
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconEngine size={24} color={theme.palette.primary.main} />
                        <Typography variant="h3" sx={{ fontWeight: 800 }}>QUẢN LÝ TRẠM BƠM</Typography>
                    </Stack>
                }
                secondary={
                    <PermissionGuard permission="trambom:edit">
                        <AnimateButton>
                            <Button 
                                variant="contained" 
                                color="secondary"
                                startIcon={<IconPlus size={20} />} 
                                onClick={handleAdd} 
                                sx={{ 
                                    borderRadius: '12px', 
                                    fontWeight: 800, 
                                    fontSize: '0.95rem', 
                                    px: 2.5, 
                                    py: 1,
                                    boxShadow: '0 4px 12px rgba(103, 58, 183, 0.2)'
                                }}
                            >
                                {isMobile ? 'Thêm' : 'Thêm trạm bơm'}
                            </Button>
                        </AnimateButton>
                    </PermissionGuard>
                }
            >
                <Box sx={{ mb: 3 }}>
                    <Stack direction={isMobile ? "column" : "row"} spacing={1.5} alignItems="center">
                        <TextField
                            label="Tìm theo tên trạm bơm"
                            value={searchFilter}
                            placeholder="Nhập tên hoặc địa chỉ..."
                            onChange={(e) => setSearchFilter(e.target.value)}
                            size="small"
                            slotProps={{ input: { sx: { borderRadius: 3 } } }}
                            sx={{ width: { xs: '100%', sm: 300 } }}
                        />

                        <OrganizationSelect
                            value={orgFilter}
                            onChange={(e) => setOrgFilter(e.target.value)}
                            sx={{ width: { xs: '100%', sm: 300 } }}
                        />
                    </Stack>
                </Box>

                {/* Mobile View */}
                <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                    {filteredData.length === 0 ? (
                        <Typography align="center" sx={{ py: 3, color: 'text.secondary' }}>Không tìm thấy trạm bơm</Typography>
                    ) : (
                        filteredData.map((item) => (
                            <PumpingStationMobileCard
                                key={item.id}
                                item={item}
                                getOrgNames={getOrgNames}
                                handleHistory={handleHistory}
                                handleEdit={handleEdit}
                                handleDelete={handleDelete}
                                hasPermission={hasPermission}
                                isCompany={isCompany}
                                user={user}
                            />
                        ))
                    )}
                </Box>

                {/* Desktop Table View */}
                <TableContainer component={Paper} elevation={0} sx={{ display: { xs: 'none', sm: 'block' }, border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell sx={{ fontWeight: 800 }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>Tên trạm bơm</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>Địa chỉ</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>Số lượng bơm</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>Tự động</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>Đơn vị quản lý</TableCell>
                                <TableCell sx={{ fontWeight: 800, display: { xs: 'none', lg: 'table-cell' } }}>Đơn vị phối hợp</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800 }}>Trọng số</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3 }}>Không tìm thấy trạm bơm</TableCell></TableRow>
                            ) : (
                                filteredData.map((item, index) => (
                                    <PumpingStationDesktopRow
                                        key={item.id}
                                        item={item}
                                        index={index}
                                        getOrgNames={getOrgNames}
                                        handleHistory={handleHistory}
                                        handleEdit={handleEdit}
                                        handleDelete={handleDelete}
                                        hasPermission={hasPermission}
                                        isCompany={isCompany}
                                        user={user}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <PumpingStationDialog
                    open={open}
                    handleClose={() => setOpen(false)}
                    item={selected}
                    refresh={loadData}
                    organizations={orgs}
                />

                {openHistory && <PumpingStationHistoryDialog open={openHistory} handleClose={() => setOpenHistory(false)} item={selected} />}

                <ConfirmDialog
                    open={confirmOpen}
                    onClose={() => setConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    loading={loading}
                    itemName={deletingItem?.name}
                    title="Xóa trạm bơm"
                    description="Bạn có chắc muốn xóa trạm bơm này? Dữ liệu lịch sử vận hành cũng sẽ bị gỡ bỏ."
                />
            </MainCard>
        </PermissionGuard>
    );
};

export default PumpingStationPage;
