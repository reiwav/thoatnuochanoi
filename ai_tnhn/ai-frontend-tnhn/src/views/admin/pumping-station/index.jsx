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
import { IconEdit, IconTrash, IconPlus, IconHistory, IconChevronDown, IconChevronUp, IconEngine, IconClock, IconUser } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { CircularProgress, Box, Typography, Collapse, Grid, Divider, Paper, useTheme, Chip, useMediaQuery } from '@mui/material';
import pumpingStationApi from 'api/pumpingStation';
import organizationApi from 'api/organization';
import PumpingStationDialog from './PumpingStationDialog';
import PumpingStationHistoryDialog from './PumpingStationHistoryDialog';
import PumpingStationReport from './PumpingStationReport';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';

const PumpingStationRow = ({ item, index, getOrgNames, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const theme = useTheme();
    const [open, setOpen] = useState(!!item.last_report);
    const lastReport = item.last_report;

    return (
        <>
            <TableRow hover sx={{ '& > *': { borderBottom: lastReport ? '1px dashed' : '1px solid', borderColor: 'divider' } }}>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    {lastReport && (
                        <IconButton size="small" onClick={() => setOpen(!open)}>
                            {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>{index + 1}</TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{item.name}</Typography>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" color="textSecondary">{item.address || '-'}</Typography>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.pump_count}</Typography>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Chip
                        label={item.is_auto ? 'Có' : 'Không'}
                        size="small"
                        color={item.is_auto ? 'primary' : 'default'}
                        variant={item.is_auto ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700 }}
                    />
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>{getOrgNames(item.org_id)}</Typography>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }}>
                    <Typography variant="body2" color="textSecondary">{item.share_all ? 'Tất cả xí nghiệp' : (getOrgNames(item.shared_org_ids) || '-')}</Typography>
                </TableCell>
                <TableCell sx={{ p: { xs: 1, md: 2 } }} align="center">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.priority || 0}</Typography>
                </TableCell>
                <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Lịch sử vận hành">
                            <IconButton color="info" onClick={() => handleHistory(item)}>
                                <IconHistory size="18" />
                            </IconButton>
                        </Tooltip>
                        {hasPermission('trambom:edit') && (isCompany || user?.org_id === item.org_id) && (
                            <Tooltip title="Chỉnh sửa">
                                <IconButton color="primary" onClick={() => handleEdit(item)}>
                                    <IconEdit size="18" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {hasPermission('trambom:delete') && (isCompany || user?.org_id === item.org_id) && (
                            <Tooltip title="Xóa">
                                <IconButton color="error" onClick={() => handleDelete(item.id)}>
                                    <IconTrash size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
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
    const [orgs, setOrgs] = useState({ primary: [], shared: [] });
    const [orgFilter, setOrgFilter] = useState('');

    const isAdmin = hasPermission('trambom:view');

    const fetchStations = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            if (isAdmin) {
                const res = await pumpingStationApi.list({ per_page: 1000, org_id: orgFilter });
                setData(res.data || res || []);
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

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa trạm bơm này?')) {
            try {
                await pumpingStationApi.delete(id);
                loadData();
                toast.success('Xóa thành công');
            } catch (error) {
                toast.error('Xóa thất bại');
            }
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

    if (!isAdmin) {
        if (!assignedStation) return <Box sx={{ p: 3 }}><Typography color="error">Bạn chưa được gán vào trạm bơm nào. Vui lòng liên hệ quản lý.</Typography></Box>;
        return <PumpingStationReport station={assignedStation} />;
    }

    return (
        <MainCard
            title={
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconEngine size={24} color={theme.palette.primary.main} />
                    <Typography variant="h3" sx={{ fontWeight: 800 }}>QUẢN LÝ TRẠM BƠM</Typography>
                </Stack>
            }
            secondary={
                hasPermission('trambom:edit') && (
                    <Button variant="contained" startIcon={<IconPlus />} onClick={handleAdd} sx={{ borderRadius: 3, fontWeight: 700 }}>
                        {isMobile ? 'Thêm' : 'Thêm trạm bơm'}
                    </Button>
                )
            }
        >
            <Box sx={{ mb: 3 }}>
                <Stack direction={isMobile ? "column" : "row"} spacing={1.5} alignItems="center">
                    <OrganizationSelect
                        value={orgFilter}
                        onChange={(e) => setOrgFilter(e.target.value)}
                        sx={{ width: { xs: '100%', sm: 300 } }}
                    />
                </Stack>
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '& .MuiTableCell-root': { fontSize: { xs: '0.875rem' } } }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ width: 40 }} />
                            <TableCell sx={{ fontWeight: 700 }}>STT</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Tên trạm bơm</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Địa chỉ</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Số lượng bơm</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Tự động</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Đơn vị quản lý</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Đơn vị phối hợp</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Trọng số</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(data || []).map((item, index) => (
                            <PumpingStationRow
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
                        ))}
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

            {selected && (
                <PumpingStationHistoryDialog
                    open={openHistory}
                    handleClose={() => setOpenHistory(false)}
                    station={selected}
                />
            )}
        </MainCard>
    );
};

export default PumpingStationPage;
