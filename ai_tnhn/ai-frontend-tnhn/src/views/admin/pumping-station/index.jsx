import React, { useState, useEffect, useMemo } from 'react';
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
import { 
    IconEdit, IconTrash, IconPlus, IconHistory, IconChevronDown, 
    IconChevronUp, IconEngine, IconClock, IconUser, IconSearch,
    IconDroplets, IconArrowLeft
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { 
    CircularProgress, Box, Typography, Collapse, Grid, Divider, Paper, 
    useTheme, Chip, useMediaQuery, Card, CardContent, TextField, 
    Tabs, Tab, alpha, Pagination, List, ListItem, ListItemText 
} from '@mui/material';

// APIs
import pumpingStationApi from 'api/pumpingStation';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';
import organizationApi from 'api/organization';

// Dialogs
import PumpingStationDialog from './PumpingStationDialog';
import PumpingStationHistoryDialog from './PumpingStationHistoryDialog';
import WastewaterTreatmentDialog from '../wastewater-treatment/WastewaterTreatmentDialog';
import WastewaterTreatmentHistoryDialog from '../wastewater-treatment/WastewaterTreatmentHistoryDialog';

import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';
import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import PermissionGuard from 'ui-component/PermissionGuard';
import ConfirmDialog from 'ui-component/ConfirmDialog';
import AnimateButton from 'ui-component/extended/AnimateButton';

// --- SHARED COMPONENTS ---
const LogStatusChip = ({ report }) => {
    if (!report) return <Chip label="Chưa có dữ liệu" size="small" variant="outlined" sx={{ fontWeight: 700 }} />;
    return (
        <Stack direction="row" spacing={0.5}>
            {report.operating_count > 0 && <Chip label={`Vận hành: ${report.operating_count}`} size="small" color="error" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />}
            {report.closed_count > 0 && <Chip label={`Dừng: ${report.closed_count}`} size="small" color="success" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />}
            {report.maintenance_count > 0 && <Chip label={`Bảo dưỡng: ${report.maintenance_count}`} size="small" color="warning" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />}
            {report.no_signal_count > 0 && <Chip label={`Ko tín hiệu: ${report.no_signal_count}`} size="small" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem', bgcolor: 'grey.300' }} />}
        </Stack>
    );
};

const ActionButtons = ({ item, type, hasPermission, isCompany, user, handleHistory, handleEdit, handleDelete }) => {
    const editPerm = type === 'pumping' ? 'trambom:edit' : 'wastewater:edit';
    const deletePerm = type === 'pumping' ? 'trambom:delete' : 'wastewater:delete';
    
    return (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title={type === 'pumping' ? "Lịch sử vận hành" : "Lịch sử báo cáo"}>
                <IconButton color="info" size="small" onClick={(e) => { e.stopPropagation(); handleHistory(item); }}>
                    <IconHistory size={20} />
                </IconButton>
            </Tooltip>
            {hasPermission(editPerm) && (isCompany || user?.org_id === item.org_id) && (
                <Tooltip title="Chỉnh sửa">
                    <IconButton color="primary" size="small" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                        <IconEdit size={20} />
                    </IconButton>
                </Tooltip>
            )}
            {hasPermission(deletePerm) && (isCompany || user?.org_id === item.org_id) && (
                <Tooltip title="Xóa">
                    <IconButton color="error" size="small" onClick={(e) => { e.stopPropagation(); handleDelete(item); }}>
                        <IconTrash size={20} />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    );
};

// --- PUMPING STATION COMPONENTS ---
const PumpingStationDesktopRow = ({ item, index, getOrgNames, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const lastReport = item.last_report;

    return (
        <React.Fragment>
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
                <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.priority || 0}</Typography>
                </TableCell>
                <TableCell align="right">
                    <ActionButtons
                        item={item} type="pumping" hasPermission={hasPermission} isCompany={isCompany} user={user}
                        handleHistory={handleHistory} handleEdit={handleEdit} handleDelete={handleDelete}
                    />
                </TableCell>
            </TableRow>
            {lastReport && (
                <TableRow>
                    <TableCell sx={{ py: 0 }} colSpan={9}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ my: 2, mx: 1, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 800, color: 'primary.main', mb: 1.5 }}>
                                    Trạng thái vận hành mới nhất
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'error.light', textAlign: 'center' }}>
                                            <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, display: 'block' }}>VẬN HÀNH</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.operating_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'success.light', textAlign: 'center' }}>
                                            <Typography variant="caption" color="success.main" sx={{ fontWeight: 800, display: 'block' }}>DỪNG</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.closed_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'warning.light', textAlign: 'center' }}>
                                            <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 800, display: 'block' }}>BẢO DƯỠNG</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.maintenance_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.300', textAlign: 'center' }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block' }}>KO TÍN HIỆU</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.no_signal_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Stack spacing={0.5}>
                                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>"{lastReport.note || 'Không có ghi chú'}"</Typography>
                                            <Typography variant="caption" color="text.disabled">
                                                {lastReport.user_name} • {dayjs(lastReport.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                            </Typography>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
};

// --- WASTEWATER TREATMENT COMPONENTS ---
const WastewaterDesktopRow = ({ item, index, getOrgNames, onClick, handleHistory, handleEdit, handleDelete, hasPermission, isCompany, user }) => {
    const theme = useTheme();
    const lastReport = item.last_report;

    return (
        <React.Fragment>
            <TableRow 
                hover 
                onClick={() => onClick(item)}
                sx={{ cursor: 'pointer', '& > *': { borderBottom: lastReport ? 'none' : '1px solid', borderColor: 'divider' } }}
            >
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
                        item={item} type="wastewater" hasPermission={hasPermission} isCompany={isCompany} user={user}
                        handleHistory={handleHistory} handleEdit={handleEdit} handleDelete={handleDelete}
                    />
                </TableCell>
            </TableRow>
            {lastReport && (
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                    <TableCell 
                        onClick={() => onClick(item)}
                        sx={{ py: 0, borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer' }} colSpan={7}
                    >
                        <Box sx={{ mb: 1.5, mx: 1, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="primary" sx={{ fontWeight: 800, mb: 1, display: 'block' }}>NHẬN XÉT MỚI NHẤT</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={9}>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary' }}>"{lastReport.note}"</Typography>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Typography variant="caption" color="text.secondary" align="right" sx={{ display: 'block' }}>
                                        {lastReport.user_name} • {dayjs(lastReport.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
};

const WastewaterHistoryView = ({ station, onBack }) => {
    const theme = useTheme();
    const [history, setHistory] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const perPage = 10;

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await wastewaterTreatmentApi.getHistory(station.id, { page, per_page: perPage });
            if (res && res.data) {
                setHistory(res.data);
                setTotal(res.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [station.id, page]);

    return (
        <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <IconButton onClick={onBack} size="small" sx={{ bgcolor: 'grey.100' }}>
                    <IconArrowLeft size={20} />
                </IconButton>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>{station.name}</Typography>
                    <Typography variant="caption" color="text.secondary">Lịch sử báo cáo vận hành</Typography>
                </Box>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
            ) : (
                <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
                    <List sx={{ p: 0 }}>
                        {history.length > 0 ? (
                            history.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    <ListItem alignItems="flex-start" sx={{ p: 2 }}>
                                        <ListItemText
                                            primary={
                                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                                        {dayjs(item.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.user_name}</Typography>
                                                </Stack>
                                            }
                                            secondary={
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', fontStyle: 'italic' }}
                                                >
                                                    {item.note}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                    {index < history.length - 1 && <Divider />}
                                </React.Fragment>
                            ))
                        ) : (
                            <Box sx={{ py: 5, textAlign: 'center' }}><Typography color="text.secondary">Chưa có dữ liệu lịch sử</Typography></Box>
                        )}
                    </List>
                </Paper>
            )}

            {total > perPage && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Pagination 
                        count={Math.ceil(total / perPage)} 
                        page={page} 
                        onChange={(e, v) => setPage(v)} 
                        color="primary"
                    />
                </Box>
            )}
        </Box>
    );
};

// --- MAIN PAGE COMPONENT ---
const PumpingStationPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user, isCompany, hasPermission } = useAuthStore();
    
    const [activeTab, setActiveTab] = useState(0); // 0: Pumping, 1: Wastewater
    const [drillDownStation, setDrillDownStation] = useState(null);

    const [pumpingData, setPumpingData] = useState([]);
    const [wasteData, setWasteData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog states
    const [openPumping, setOpenPumping] = useState(false);
    const [openWaste, setOpenWaste] = useState(false);
    const [openHistory, setOpenHistory] = useState(false);
    const [selected, setSelected] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    
    const [orgs, setOrgs] = useState({ primary: [], shared: [] });
    const [orgFilter, setOrgFilter] = useState((!isCompany && user?.org_id) ? user.org_id : '');
    const [searchFilter, setSearchFilter] = useState('');

    const currentData = activeTab === 0 ? pumpingData : wasteData;

    const filteredData = useMemo(() => {
        if (!Array.isArray(currentData)) return [];
        const q = searchFilter.toLowerCase();
        return currentData.filter(item =>
            item.name?.toLowerCase().includes(q) ||
            item.address?.toLowerCase().includes(q)
        );
    }, [currentData, searchFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pRes, wRes, oRes] = await Promise.all([
                pumpingStationApi.list({ per_page: 1000, org_id: orgFilter }),
                wastewaterTreatmentApi.list({ per_page: 1000, org_id: orgFilter }),
                organizationApi.getSelectionList()
            ]);
            setPumpingData(pRes?.data || (Array.isArray(pRes) ? pRes : []));
            setWasteData(wRes?.data || (Array.isArray(wRes) ? wRes : []));
            setOrgs(oRes || { primary: [], shared: [] });
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [orgFilter]);

    const handleAdd = () => {
        setSelected(null);
        if (activeTab === 0) setOpenPumping(true);
        else setOpenWaste(true);
    };

    const handleEdit = (item) => {
        setSelected(item);
        if (activeTab === 0) setOpenPumping(true);
        else setOpenWaste(true);
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
            if (activeTab === 0) await pumpingStationApi.delete(deletingItem.id);
            else await wastewaterTreatmentApi.delete(deletingItem.id);
            toast.success('Xóa thành công');
            loadData();
        } catch (error) {
            toast.error('Xóa thất bại');
        } finally {
            setConfirmOpen(false);
            setLoading(false);
        }
    };

    const getOrgNames = (ids) => {
        if (!ids) return '';
        const idList = Array.isArray(ids) ? ids : [ids];
        const allOrgs = [...(orgs.primary || []), ...(orgs.shared || [])];
        return idList.map(id => allOrgs.find(o => o.id === id)?.name).filter(Boolean).join(', ');
    };

    return (
        <MainCard
            contentSX={{ p: { xs: 1.5, sm: 2.5 } }}
            sx={{ mx: { xs: -1.5, sm: 0 }, borderRadius: { xs: 0, sm: 4 } }}
            title={
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    {activeTab === 0 ? <IconEngine size={28} color={theme.palette.primary.main} /> : <IconDroplets size={28} color={theme.palette.secondary.main} />}
                    <Typography variant="h3" sx={{ fontWeight: 900 }}>
                        {activeTab === 0 ? 'QUẢN LÝ TRẠM BƠM' : 'QUẢN LÝ TRẠM XLNT'}
                    </Typography>
                </Stack>
            }
            secondary={
                !drillDownStation && (
                    <PermissionGuard permission={activeTab === 0 ? "trambom:create" : "wastewater:create"}>
                        <AnimateButton>
                            <Button 
                                variant="contained" 
                                color={activeTab === 0 ? "primary" : "secondary"}
                                startIcon={<IconPlus size={20} />} 
                                onClick={handleAdd}
                                sx={{ borderRadius: 2.5, fontWeight: 800, px: 3 }}
                            >
                                Thêm {activeTab === 0 ? 'trạm bơm' : 'trạm XLNT'}
                            </Button>
                        </AnimateButton>
                    </PermissionGuard>
                )
            }
        >
            <Box sx={{ mb: 4 }}>
                <Tabs 
                    value={activeTab} 
                    onChange={(e, v) => { setActiveTab(v); setDrillDownStation(null); }}
                    sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '& .MuiTab-root': { fontWeight: 800, fontSize: '1rem', py: 2 }
                    }}
                >
                    <Tab label="Trạm bơm" icon={<IconEngine size={20} />} iconPosition="start" />
                    <Tab label="Trạm xử lý nước thải" icon={<IconDroplets size={20} />} iconPosition="start" />
                </Tabs>
            </Box>

            {!drillDownStation ? (
                <>
                    <Box sx={{ mb: 3 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                label="Tìm kiếm"
                                size="small"
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                sx={{ width: { xs: '100%', sm: 300 } }}
                                slotProps={{ input: { startAdornment: <IconSearch size={18} style={{ marginRight: 8, opacity: 0.5 }} />, sx: { borderRadius: 3 } } }}
                            />
                            <OrganizationSelect
                                value={orgFilter}
                                onChange={(e) => setOrgFilter(e.target.value)}
                                sx={{ width: { xs: '100%', sm: 300 } }}
                            />
                        </Stack>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                    ) : (
                        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                            <Table>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    {activeTab === 0 ? (
                                        <TableRow>
                                            <TableCell sx={{ width: 40 }} />
                                            <TableCell sx={{ fontWeight: 800 }}>STT</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Tên trạm bơm</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Địa chỉ</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Số bơm</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Tự động</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Quản lý</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 800 }}>Số BC</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>Thao tác</TableCell>
                                        </TableRow>
                                    ) : (
                                        <TableRow>
                                            <TableCell sx={{ width: 40 }} />
                                            <TableCell sx={{ fontWeight: 800 }}>STT</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Tên trạm XLNT</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Địa chỉ</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Quản lý</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 800 }}>Số BC</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800 }}>Thao tác</TableCell>
                                        </TableRow>
                                    )}
                                </TableHead>
                                <TableBody>
                                    {filteredData.length === 0 ? (
                                        <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3 }}>Không tìm thấy dữ liệu</TableCell></TableRow>
                                    ) : (
                                        filteredData.map((item, index) => (
                                            activeTab === 0 ? (
                                                <PumpingStationDesktopRow
                                                    key={item.id} item={item} index={index}
                                                    getOrgNames={getOrgNames} hasPermission={hasPermission} isCompany={isCompany} user={user}
                                                    handleEdit={handleEdit} handleDelete={handleDelete} handleHistory={handleHistory}
                                                />
                                            ) : (
                                                <WastewaterDesktopRow
                                                    key={item.id} item={item} index={index}
                                                    getOrgNames={getOrgNames} onClick={setDrillDownStation}
                                                    hasPermission={hasPermission} isCompany={isCompany} user={user}
                                                    handleEdit={handleEdit} handleDelete={handleDelete} handleHistory={handleHistory}
                                                />
                                            )
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </>
            ) : (
                <WastewaterHistoryView station={drillDownStation} onBack={() => setDrillDownStation(null)} />
            )}

            {/* Dialogs */}
            <PumpingStationDialog 
                open={openPumping} handleClose={() => setOpenPumping(false)} 
                item={selected} refresh={loadData} organizations={orgs} 
            />
            <WastewaterTreatmentDialog 
                open={openWaste} handleClose={() => setOpenWaste(false)} 
                item={selected} refresh={loadData} organizations={orgs} 
            />
            
            {openHistory && activeTab === 0 && (
                <PumpingStationHistoryDialog open={openHistory} handleClose={() => setOpenHistory(false)} item={selected} />
            )}
            {openHistory && activeTab === 1 && (
                <WastewaterTreatmentHistoryDialog open={openHistory} handleClose={() => setOpenHistory(false)} item={selected} />
            )}

            <ConfirmDialog
                open={confirmOpen} onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete} loading={loading} itemName={deletingItem?.name}
                title={activeTab === 0 ? "Xóa trạm bơm" : "Xóa trạm XLNT"}
                description="Hành động này không thể hoàn tác. Mọi dữ liệu lịch sử liên quan sẽ bị xóa."
            />
        </MainCard>
    );
};

export default PumpingStationPage;
