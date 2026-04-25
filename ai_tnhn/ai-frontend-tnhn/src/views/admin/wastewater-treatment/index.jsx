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
import { IconEdit, IconTrash, IconPlus, IconHistory, IconChevronDown, IconChevronUp, IconDroplets, IconClock, IconUser } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { CircularProgress, Box, Typography, Collapse, Grid, Divider, Paper, useTheme, useMediaQuery, Card, CardContent, TextField, alpha } from '@mui/material';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';
import organizationApi from 'api/organization';
import WastewaterTreatmentDialog from './WastewaterTreatmentDialog';
import WastewaterTreatmentHistoryDialog from './WastewaterTreatmentHistoryDialog';
import WastewaterTreatmentReport from './WastewaterTreatmentReport';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import PermissionGuard from 'ui-component/PermissionGuard';
import ConfirmDialog from 'ui-component/ConfirmDialog';
import AnimateButton from 'ui-component/extended/AnimateButton';

const ActionButtons = ({ item, hasPermission, isCompany, user, handleHistory, handleEdit, handleDelete }) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        <Tooltip title="Lịch sử báo cáo">
            <IconButton color="info" size="small" onClick={() => handleHistory(item)}>
                <IconHistory size={20} />
            </IconButton>
        </Tooltip>
        {hasPermission('station:edit') && (isCompany || user?.org_id === item.org_id) && (
            <Tooltip title="Chỉnh sửa">
                <IconButton color="primary" size="small" onClick={() => handleEdit(item)}>
                    <IconEdit size={20} />
                </IconButton>
            </Tooltip>
        )}
        {hasPermission('station:delete') && (isCompany || user?.org_id === item.org_id) && (
            <Tooltip title="Xóa">
                <IconButton color="error" size="small" onClick={() => handleDelete(item)}>
                    <IconTrash size={20} />
                </IconButton>
            </Tooltip>
        )}
    </Stack>
);

const WastewaterMobileCard = ({ item, getOrgNames, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const lastReport = item.last_report;

    return (
        <Card sx={{ mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>{item.name}</Typography>
                    </Box>

                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>ĐƠN VỊ QUẢN LÝ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>{getOrgNames(item.org_id) || '-'}</Typography>
                    </Box>

                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>TRẠNG THÁI GẦN NHẤT</Typography>
                        {lastReport ? (
                            <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider', mt: 0.5 }}>
                                <ReportSummary lastReport={lastReport} />
                            </Box>
                        ) : (
                            <Typography variant="caption" color="text.disabled">Chưa có báo cáo</Typography>
                        )}
                    </Box>

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '60%' }}>{item.address}</Typography>
                        <ActionButtons
                            item={item} hasPermission={hasPermission} isCompany={isCompany} user={user}
                            handleHistory={handleHistory} handleEdit={handleEdit} handleDelete={handleDelete}
                        />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

const ReportSummary = ({ lastReport }) => {
    if (!lastReport) return null;
    return (
        <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconClock size={14} color="gray" />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {dayjs(lastReport.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconUser size={14} color="gray" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{lastReport.user_name}</Typography>
            </Box>
            <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider', fontStyle: 'italic' }}>
                {lastReport.note}
            </Typography>
        </Stack>
    );
};

const WastewaterDesktopRow = ({ item, index, getOrgNames, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const theme = useTheme();
    const lastReport = item.last_report;

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& > *': { borderBottom: lastReport ? 'none' : '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ width: 40 }} />
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{item.name}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="textSecondary">{item.address || '-'}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>{getOrgNames(item.org_id)}</Typography>
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
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                    <TableCell sx={{ py: 0, borderBottom: '1px solid', borderColor: 'divider' }} colSpan={7}>
                        <Box sx={{ mb: 1.5, mx: 1, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 800, color: 'primary.main', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconClock size={16} /> Nhận xét vận hành mới nhất
                            </Typography>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={9}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic', bgcolor: 'grey.50', p: 1.5, borderRadius: 1.5, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                                        "{lastReport.note}"
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Stack spacing={0.5}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <IconUser size={12} /> {lastReport.user_name}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600 }}>
                                            {dayjs(lastReport.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                        </Typography>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Box>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
};

const WastewaterTreatmentPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user, isCompany, hasPermission } = useAuthStore();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [openHistory, setOpenHistory] = useState(false);
    const [selected, setSelected] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    const [orgs, setOrgs] = useState({ primary: [], shared: [] });

    const [orgFilter, setOrgFilter] = useState((!isCompany && user?.org_id) ? user.org_id : '');
    const [searchFilter, setSearchFilter] = useState('');
    const [filteredData, setFilteredData] = useState([]);

    const canViewList = hasPermission(['trambom:view', 'trambom:edit', 'trambom:control']);

    const fetchStations = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await wastewaterTreatmentApi.list({ per_page: 1000, org_id: orgFilter });
            setData(res?.data || []);
        } catch (error) {
            console.error('Failed to fetch wastewater stations', error);
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
    }, [orgFilter]);

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
            await wastewaterTreatmentApi.delete(deletingItem.id);
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

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    if (!hasPermission(['trambom:view', 'trambom:edit', 'trambom:control'])) return null;

    return (
        <MainCard
                title={
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <IconDroplets size={isMobile ? 22 : 28} color={theme.palette.primary.main} />
                        <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 900 }}>
                            QUẢN LÝ TRẠM XLNT
                        </Typography>
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
                                sx={{ borderRadius: 2.5, fontWeight: 800, px: 3, boxShadow: theme.shadows[4] }}
                            >
                                Thêm trạm XLNT
                            </Button>
                        </AnimateButton>
                    </PermissionGuard>
                }
            >
                <Box sx={{ mb: 4 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="Tìm kiếm trạm XLNT"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            size="small"
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
                    {filteredData.map((item) => (
                        <WastewaterMobileCard
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
                    ))}
                </Box>

                {/* Desktop View */}
                <TableContainer component={Paper} elevation={0} sx={{ display: { xs: 'none', sm: 'block' }, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ width: 40 }} />
                                <TableCell sx={{ fontWeight: 800 }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>Tên trạm XLNT</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>Địa chỉ</TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>Đơn vị quản lý</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800 }}>Ưu tiên</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>Không có dữ liệu trạm XLNT</TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item, index) => (
                                    <WastewaterDesktopRow
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

                <WastewaterTreatmentDialog
                    open={open}
                    handleClose={() => setOpen(false)}
                    item={selected}
                    refresh={loadData}
                    organizations={orgs}
                />

                <WastewaterTreatmentHistoryDialog
                    open={openHistory}
                    handleClose={() => setOpenHistory(false)}
                    item={selected}
                />

                <ConfirmDialog
                    open={confirmOpen}
                    onClose={() => setConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    loading={loading}
                    itemName={deletingItem?.name}
                    title="Xóa trạm XLNT"
                    description="Bạn có chắc chắn muốn xóa trạm xử lý nước thải này? Mọi dữ liệu liên quan sẽ bị xóa vĩnh viễn."
                />
        </MainCard>
    );
};

export default WastewaterTreatmentPage;
