import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Stack, Avatar, Skeleton, CircularProgress,
    Grid, TextField, useTheme, Tabs, Tab, Paper, alpha,
    Pagination, IconButton, List, ListItem, ListItemText, Divider, Chip
} from '@mui/material';
import { 
    IconEngine, IconSearch, IconDroplets, IconArrowLeft, 
    IconClock, IconUser, IconEdit, IconHistory, IconMapPin 
} from '@tabler/icons-react';

import usePumpingStationStore from 'store/usePumpingStationStore';
import pumpingStationApi from 'api/pumpingStation';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';
import dayjs from 'dayjs';

import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
// Components
import EmployeeActionDialog from '../../employee/components/EmployeeActionDialog';
import PumpingStationCard from '../../employee/pumping-station/components/PumpingStationCard';

// --- LOCAL COMPONENTS ---
const WastewaterTreatmentCard = ({ station, onUpdate, onViewHistory }) => {
    const theme = useTheme();
    const lastReport = station.last_report || {};

    return (
        <Paper
            elevation={2}
            onClick={() => onViewHistory && onViewHistory(station)}
            sx={{
                p: 2.5,
                width: '100%',
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                minHeight: 360,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                    borderColor: 'secondary.light'
                }
            }}
        >
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Avatar sx={{
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    width: 48,
                    height: 48,
                    color: theme.palette.secondary.main,
                    border: '1px solid',
                    borderColor: 'secondary.light',
                    flexShrink: 0
                }}>
                    <IconDroplets size={24} />
                </Avatar>
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Typography variant="h4" noWrap sx={{ fontWeight: 900, color: 'text.primary' }}>{station.name}</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconMapPin size={14} color={theme.palette.text.secondary} />
                        <Typography variant="caption" color="textSecondary" noWrap sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                            {station.address || '...'}
                        </Typography>
                    </Stack>
                </Box>
            </Stack>

            <Box sx={{ flexGrow: 1, bgcolor: alpha(theme.palette.secondary.main, 0.03), p: 2, borderRadius: 2.5, border: '1px dashed', borderColor: 'secondary.light' }}>
                <Typography variant="caption" color="secondary" sx={{ fontWeight: 800, mb: 1, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>Báo cáo mới nhất</Typography>
                {lastReport.note ? (
                    <Box>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary', mb: 1.5, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.85rem', lineHeight: 1.4 }}>
                            "{lastReport.note}"
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.7rem' }}>{lastReport.user_name}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', fontWeight: 600 }}>
                                {dayjs(lastReport.timestamp * 1000).format('HH:mm - DD/MM')}
                            </Typography>
                        </Stack>
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', py: 1 }}>Chưa có báo cáo vận hành</Typography>
                )}
            </Box>

            <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onUpdate && onUpdate(station); }} sx={{ color: 'primary.main', bgcolor: 'primary.lighter' }}>
                    <IconEdit size={18} />
                </IconButton>
                <IconButton size="small" sx={{ color: 'info.main', bgcolor: 'info.lighter' }}>
                    <IconHistory size={18} />
                </IconButton>
            </Box>
        </Paper>
    );
};

const HistoryDrillDown = ({ station, onBack }) => {
    const theme = useTheme();
    const [history, setHistory] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const perPage = 10;

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await (station.pump_count !== undefined 
                ? pumpingStationApi.getHistory(station.id, { page, per_page: perPage })
                : wastewaterTreatmentApi.getHistory(station.id, { page, per_page: perPage }));
            
            if (res && res.data) {
                setHistory(res.data);
                setTotal(res.total || 0);
            } else if (Array.isArray(res)) {
                setHistory(res);
                setTotal(res.length);
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
        <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <IconButton onClick={onBack} sx={{ bgcolor: 'background.paper', boxShadow: 2, '&:hover': { bgcolor: 'grey.100' } }}>
                    <IconArrowLeft size={24} />
                </IconButton>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 900 }}>{station.name}</Typography>
                    <Typography variant="subtitle2" color="text.secondary">Lịch sử báo cáo vận hành</Typography>
                </Box>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
            ) : (
                <Paper variant="outlined" sx={{ borderRadius: 5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <List disablePadding>
                        {history.length > 0 ? (
                            history.map((item, index) => (
                                <React.Fragment key={item.id || index}>
                                    <ListItem alignItems="flex-start" sx={{ p: 3, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.01) } }}>
                                        <ListItemText
                                            primary={
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                                        {dayjs(item.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                                    </Typography>
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <IconUser size={16} />
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.user_name}</Typography>
                                                    </Stack>
                                                </Stack>
                                            }
                                            secondary={
                                                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                                    {station.pump_count !== undefined && (
                                                        <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                                                            <Chip label={`Vận hành: ${item.operating_count}`} size="small" color="error" sx={{ fontWeight: 800 }} />
                                                            <Chip label={`Dừng: ${item.closed_count}`} size="small" color="success" sx={{ fontWeight: 800 }} />
                                                        </Stack>
                                                    )}
                                                    <Typography variant="body1" sx={{ color: 'text.primary', fontStyle: 'italic' }}>
                                                        {item.note || 'Không có ghi chú'}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    {index < history.length - 1 && <Divider />}
                                </React.Fragment>
                            ))
                        ) : (
                            <Box sx={{ py: 8, textAlign: 'center' }}>
                                <Typography color="text.secondary" variant="h4">Chưa có bản tin nào</Typography>
                            </Box>
                        )}
                    </List>
                </Paper>
            )}

            {total > perPage && (
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                    <Pagination count={Math.ceil(total / perPage)} page={page} onChange={(e, v) => setPage(v)} color="primary" size="large" />
                </Box>
            )}
        </Box>
    );
};

const StationPumpingSummary = () => {
    const theme = useTheme();
    const { pumpingStations, loading: loadingPumping, fetchPumpingStations } = usePumpingStationStore();
    
    const [wasteStations, setWasteStations] = useState([]);
    const [loadingWaste, setLoadingWaste] = useState(false);
    const [activeTab, setActiveTab] = useState(0); // 0: Pumping, 1: Wastewater
    const [drillDownStation, setDrillDownStation] = useState(null);

    const [selectedOrg, setSelectedOrg] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [taskDialog, setTaskDialog] = useState({ open: false, data: null, mode: 'PUMPING' });

    const fetchWasteStations = async () => {
        setLoadingWaste(true);
        try {
            const res = await wastewaterTreatmentApi.list({ per_page: 1000 });
            setWasteStations(res?.data || (Array.isArray(res) ? res : []));
        } catch (error) {
            console.error('Failed to fetch waste stations', error);
        } finally {
            setLoadingWaste(false);
        }
    };

    useEffect(() => {
        fetchPumpingStations();
        fetchWasteStations();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTab === 0) fetchPumpingStations();
            else fetchWasteStations();
        }, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [activeTab]);

    const activeList = activeTab === 0 ? pumpingStations : wasteStations;
    const isLoading = activeTab === 0 ? loadingPumping : loadingWaste;

    const filteredStations = useMemo(() => {
        let result = activeList;
        
        // Filter by organization
        if (selectedOrg !== 'all' && selectedOrg) {
            result = result.filter(s => (s.org_id === selectedOrg || s.orgID === selectedOrg));
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(s => 
                s.name?.toLowerCase().includes(q) || 
                s.address?.toLowerCase().includes(q)
            );
        }
        
        return result;
    }, [activeList, searchQuery, selectedOrg]);

    const handleUpdate = (station) => {
        setTaskDialog({ 
            open: true, 
            data: station, 
            mode: activeTab === 0 ? 'PUMPING' : 'WASTEWATER' 
        });
    };

    const handleViewHistory = (station) => {
        setDrillDownStation(station);
    };

    return (
        <Box sx={{ px: { xs: 1.5, md: 3 }, pt: 3, pb: 10 }}>
            {/* Header */}
            {!drillDownStation && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 1), width: 36, height: 36, boxShadow: theme.shadows[2] }}>
                            {activeTab === 0 ? <IconEngine size={20} color="white" /> : <IconDroplets size={20} color="white" />}
                        </Avatar>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.dark', lineHeight: 1.1 }}>
                                {activeTab === 0 ? 'GIÁM SÁT TRẠM BƠM' : 'GIÁM SÁT TRẠM XLNT'}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                                Hệ thống báo cáo thời gian thực
                            </Typography>
                        </Box>
                    </Stack>
                </Box>
            )}

            {!drillDownStation && (
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    variant="fullWidth"
                    sx={{
                        mb: 1.5,
                        bgcolor: 'background.paper',
                        borderRadius: 3,
                        p: 0.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        '& .MuiTabs-indicator': { height: '100%', borderRadius: 2.5, opacity: 0.1, bgcolor: 'primary.main' }
                    }}
                >
                    <Tab 
                        label="TRẠM BƠM" icon={<IconEngine size={18} />} iconPosition="start" 
                        sx={{ fontWeight: 800, fontSize: '0.9rem', color: 'text.secondary', minHeight: 44, '&.Mui-selected': { color: 'primary.main' } }}
                    />
                    <Tab 
                        label="TRẠM XLNT" icon={<IconDroplets size={18} />} iconPosition="start"
                        sx={{ fontWeight: 800, fontSize: '0.9rem', color: 'text.secondary', minHeight: 44, '&.Mui-selected': { color: 'secondary.main' } }}
                    />
                </Tabs>
            )}

            {!drillDownStation ? (
                <>
                    <Box sx={{ mb: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={8}>
                                <TextField
                                    fullWidth
                                    placeholder="Tìm kiếm trạm hoặc địa chỉ..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    slotProps={{
                                        input: {
                                            startAdornment: <IconSearch size={20} style={{ marginRight: 10, opacity: 0.5 }} />,
                                            sx: { borderRadius: 3, bgcolor: 'background.paper', height: 48, fontSize: '1rem' }
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <OrganizationSelect
                                    value={selectedOrg === 'all' ? '' : selectedOrg}
                                    onChange={(e) => setSelectedOrg(e.target.value || 'all')}
                                    sx={{ 
                                        borderRadius: 3, 
                                        bgcolor: 'background.paper',
                                        '& .MuiOutlinedInput-root': { height: 48 }
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {isLoading && activeList.length === 0 ? (
                        <Grid container spacing={2}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <Grid item xs={6} sm={4} md={3} key={i}>
                                    <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 3 }} />
                                </Grid>
                            ))}
                        </Grid>
                    ) : filteredStations.length === 0 ? (
                        <Paper sx={{ textAlign: 'center', py: 6, borderRadius: 4, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider' }}>
                            <Typography variant="h4" color="textSecondary" sx={{ mb: 1, fontWeight: 800 }}>Không tìm thấy trạm</Typography>
                        </Paper>
                    ) : (
                        <Grid container spacing={2} alignItems="stretch">
                            {filteredStations.map(station => (
                                <Grid item xs={6} sm={4} md={3} key={station.id}>
                                    {activeTab === 0 ? (
                                        <PumpingStationCard 
                                            station={station} 
                                            onUpdate={handleUpdate} 
                                            onViewHistory={handleViewHistory}
                                        />
                                    ) : (
                                        <WastewaterTreatmentCard 
                                            station={station} 
                                            onUpdate={handleUpdate} 
                                            onViewHistory={handleViewHistory}
                                        />
                                    )}
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </>
            ) : (
                <HistoryDrillDown station={drillDownStation} onBack={() => setDrillDownStation(null)} />
            )}

            <EmployeeActionDialog 
                open={taskDialog.open}
                mode={taskDialog.mode}
                data={taskDialog.data}
                onClose={() => setTaskDialog({ ...taskDialog, open: false })}
                onFinished={() => {
                    setTaskDialog({ ...taskDialog, open: false });
                    if (activeTab === 0) fetchPumpingStations();
                    else fetchWasteStations();
                }}
            />
        </Box>
    );
};

export default StationPumpingSummary;
