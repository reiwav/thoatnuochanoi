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
    Tabs, Tab, alpha, Pagination, List, ListItem, ListItemText, TableSortLabel 
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

// Sub-components
import PumpingStationDesktopRow from './components/PumpingStationDesktopRow';
import PumpingStationMobileCard from './components/PumpingStationMobileCard';
import WastewaterDesktopRow from './components/WastewaterDesktopRow';
import WastewaterMobileCard from './components/WastewaterMobileCard';
import WastewaterHistoryView from './components/WastewaterHistoryView';

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
    const [sortOrder, setSortOrder] = useState('default');

    const currentData = activeTab === 0 ? pumpingData : wasteData;

    const filteredData = useMemo(() => {
        if (!Array.isArray(currentData)) return [];
        const q = searchFilter.toLowerCase();
        const filtered = currentData.filter(item =>
            item.name?.toLowerCase().includes(q) ||
            item.address?.toLowerCase().includes(q)
        );
        if (sortOrder === 'default' || !sortOrder) return filtered;
        return filtered.sort((a, b) => {
            const valA = a.priority || 0;
            const valB = b.priority || 0;
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });
    }, [currentData, searchFilter, sortOrder]);

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
                    onChange={(e, v) => { setActiveTab(v); setDrillDownStation(null); setSortOrder('default'); }}
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
                    ) : filteredData.length === 0 ? (
                        <Typography align="center" sx={{ py: 3, color: 'text.secondary' }}>Không tìm thấy dữ liệu</Typography>
                    ) : (
                        <>
                            {/* Mobile View */}
                            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                                {filteredData.map((item, index) => (
                                    activeTab === 0 ? (
                                        <PumpingStationMobileCard
                                            key={item.id} item={item} index={index}
                                            getOrgNames={getOrgNames} hasPermission={hasPermission} isCompany={isCompany} user={user}
                                            handleEdit={handleEdit} handleDelete={handleDelete} handleHistory={handleHistory}
                                        />
                                    ) : (
                                        <WastewaterMobileCard
                                            key={item.id} item={item} index={index}
                                            getOrgNames={getOrgNames} onClick={setDrillDownStation}
                                            hasPermission={hasPermission} isCompany={isCompany} user={user}
                                            handleEdit={handleEdit} handleDelete={handleDelete} handleHistory={handleHistory}
                                        />
                                    )
                                ))}
                            </Box>

                            {/* Desktop View */}
                            <TableContainer component={Paper} elevation={0} sx={{ display: { xs: 'none', sm: 'block' }, border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
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
                                                <TableCell align="center" sx={{ fontWeight: 800 }}>
                                                    <TableSortLabel
                                                        active={sortOrder !== 'default'}
                                                        direction={sortOrder === 'default' ? 'asc' : sortOrder}
                                                        onClick={() => {
                                                            if (sortOrder === 'default') setSortOrder('desc');
                                                            else if (sortOrder === 'desc') setSortOrder('asc');
                                                            else setSortOrder('default');
                                                        }}
                                                    >
                                                        Số BC
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>Thao tác</TableCell>
                                            </TableRow>
                                        ) : (
                                            <TableRow>
                                                <TableCell sx={{ width: 40 }} />
                                                <TableCell sx={{ fontWeight: 800 }}>STT</TableCell>
                                                <TableCell sx={{ fontWeight: 800 }}>Tên trạm XLNT</TableCell>
                                                <TableCell sx={{ fontWeight: 800 }}>Địa chỉ</TableCell>
                                                <TableCell sx={{ fontWeight: 800 }}>Quản lý</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 800 }}>
                                                    <TableSortLabel
                                                        active={sortOrder !== 'default'}
                                                        direction={sortOrder === 'default' ? 'asc' : sortOrder}
                                                        onClick={() => {
                                                            if (sortOrder === 'default') setSortOrder('desc');
                                                            else if (sortOrder === 'desc') setSortOrder('asc');
                                                            else setSortOrder('default');
                                                        }}
                                                    >
                                                        Số BC
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800 }}>Thao tác</TableCell>
                                            </TableRow>
                                        )}
                                    </TableHead>
                                    <TableBody>
                                        {filteredData.map((item, index) => (
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
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
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
