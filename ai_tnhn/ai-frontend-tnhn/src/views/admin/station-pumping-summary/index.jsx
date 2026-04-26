import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, Typography, Stack, Avatar, Grid, TextField, 
    useTheme, Tabs, Tab, alpha 
} from '@mui/material';
import { IconEngine, IconSearch, IconDroplets } from '@tabler/icons-react';

import usePumpingStationStore from 'store/usePumpingStationStore';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';

import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import EmployeeActionDialog from '../../employee/components/EmployeeActionDialog';

// Sub Components
import PumpingStationTab from './components/PumpingStationTab';
import WastewaterTab from './components/WastewaterTab';
import HistoryDrillDown from './components/HistoryDrillDown';

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
        }, 30000); 
        return () => clearInterval(interval);
    }, [activeTab]);

    const activeList = activeTab === 0 ? pumpingStations : wasteStations;
    const isLoading = activeTab === 0 ? loadingPumping : loadingWaste;

    const filteredStations = useMemo(() => {
        let result = activeList;
        if (selectedOrg !== 'all' && selectedOrg) {
            result = result.filter(s => (s.org_id === selectedOrg || s.orgID === selectedOrg));
        }
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
        <Box sx={{ px: { xs: 1, md: 3 }, pt: { xs: 1.5, md: 3 }, pb: 10 }}>
            {/* Header Area */}
            {!drillDownStation && (
                <Box sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, boxShadow: theme.shadows[2] }}>
                            {activeTab === 0 ? <IconEngine size={18} color="white" /> : <IconDroplets size={18} color="white" />}
                        </Avatar>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.dark', letterSpacing: -0.5, lineHeight: 1.2 }}>
                                {activeTab === 0 ? 'GIÁM SÁT TRẠM BƠM' : 'GIÁM SÁT TRẠM XLNT'}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6rem' }}>
                                Hệ thống báo cáo thời gian thực
                            </Typography>
                        </Box>
                    </Stack>

                    <Tabs
                        value={activeTab}
                        onChange={(e, v) => setActiveTab(v)}
                        variant="fullWidth"
                        sx={{
                            mb: 2,
                            bgcolor: 'background.paper',
                            borderRadius: 3,
                            p: 0.4,
                            minHeight: 38,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                            '& .MuiTabs-indicator': { height: '100%', borderRadius: 2.5, opacity: 0.1, bgcolor: 'primary.main' }
                        }}
                    >
                        <Tab 
                            label="TRẠM BƠM" icon={<IconEngine size={16} />} iconPosition="start" 
                            sx={{ fontWeight: 900, fontSize: '0.85rem', minHeight: 38, py: 0.5, '&.Mui-selected': { color: 'primary.main' } }}
                        />
                        <Tab 
                            label="TRẠM XLNT" icon={<IconDroplets size={16} />} iconPosition="start"
                            sx={{ fontWeight: 900, fontSize: '0.85rem', minHeight: 38, py: 0.5, '&.Mui-selected': { color: 'secondary.main' } }}
                        />
                    </Tabs>

                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TextField
                                fullWidth
                                placeholder="Tìm kiếm trạm hoặc địa chỉ..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: <IconSearch size={18} style={{ marginRight: 8, opacity: 0.5 }} />,
                                        sx: { borderRadius: 3, bgcolor: 'background.paper', height: 42, fontSize: '0.9rem', boxShadow: '0 1px 8px rgba(0,0,0,0.03)' }
                                    }
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <OrganizationSelect
                                value={selectedOrg === 'all' ? '' : selectedOrg}
                                onChange={(e) => setSelectedOrg(e.target.value || 'all')}
                                sx={{ 
                                    borderRadius: 3, 
                                    bgcolor: 'background.paper',
                                    boxShadow: '0 1px 8px rgba(0,0,0,0.03)',
                                    '& .MuiOutlinedInput-root': { height: 42, fontSize: '0.9rem' }
                                }}
                            />
                        </Grid>
                    </Grid>
                </Box>
            )}

            {drillDownStation ? (
                <HistoryDrillDown station={drillDownStation} onBack={() => setDrillDownStation(null)} />
            ) : (
                activeTab === 0 ? (
                    <PumpingStationTab 
                        stations={filteredStations} 
                        isLoading={isLoading} 
                        onUpdate={handleUpdate} 
                        onViewHistory={handleViewHistory} 
                    />
                ) : (
                    <WastewaterTab 
                        stations={filteredStations} 
                        isLoading={isLoading} 
                        onUpdate={handleUpdate} 
                        onViewHistory={handleViewHistory} 
                    />
                )
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
