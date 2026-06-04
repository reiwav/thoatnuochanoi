import React from 'react';
import { 
    Box, Typography, Stack, Avatar, Grid, TextField, 
    useTheme, Tabs, Tab, Chip, alpha 
} from '@mui/material';
import { IconEngine, IconSearch, IconDroplets, IconFilter } from '@tabler/icons-react';

import OrganizationSelect from 'ui-component/filter/OrganizationSelect';
import EmployeeActionDialog from '../../employee/components/EmployeeActionDialog';

// Sub Components
import PumpingStationTab from './components/PumpingStationTab';
import WastewaterTab from './components/WastewaterTab';
import HistoryDrillDown from './components/HistoryDrillDown';
import useStationPumpingSummary from './hooks/useStationPumpingSummary';

const StationPumpingSummary = () => {
    const theme = useTheme();
    const {
        activeTab,
        setActiveTab,
        drillDownStation,
        setDrillDownStation,
        selectedOrg,
        setSelectedOrg,
        searchQuery,
        setSearchQuery,
        selectedStatus,
        setSelectedStatus,
        taskDialog,
        setTaskDialog,
        isLoading,
        filteredStations,
        statusCounts,
        handleUpdate,
        handleViewHistory,
        fetchPumpingStations,
        fetchWasteStations
    } = useStationPumpingSummary();

    const statusOptions = [
        { key: 'all', label: 'Tất cả', color: theme.palette.primary.main },
        { key: 'operating', label: 'Đang vận hành', color: theme.palette.error.main },
        { key: 'closed', label: 'Không vận hành', color: theme.palette.success.main },
        { key: 'maintenance', label: 'Bảo dưỡng', color: '#FBC02D' },
        { key: 'no_signal', label: 'Mất tín hiệu', color: theme.palette.text.secondary }
    ];

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

                    <Grid container spacing={1.5} sx={{ mb: 1 }}>
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

                    {activeTab === 0 && (
                        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }} alignItems="center">
                            <IconFilter size={16} color={theme.palette.text.secondary} style={{ marginRight: 4 }} />
                            {statusOptions.map(opt => (
                                <Chip
                                    key={opt.key}
                                    label={<span>{opt.label} <span style={{ color: opt.color, fontWeight: 900 }}>({statusCounts[opt.key] ?? 0})</span></span>}
                                    size="small"
                                    onClick={() => setSelectedStatus(opt.key)}
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: '0.75rem',
                                        borderRadius: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        ...(selectedStatus === opt.key ? {
                                            bgcolor: alpha(opt.color, 0.15),
                                            color: opt.color,
                                            border: '1.5px solid',
                                            borderColor: alpha(opt.color, 0.5),
                                            boxShadow: `0 2px 8px ${alpha(opt.color, 0.2)}`
                                        } : {
                                            bgcolor: 'grey.50',
                                            color: 'text.secondary',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            '&:hover': {
                                                bgcolor: alpha(opt.color, 0.08),
                                                borderColor: alpha(opt.color, 0.3),
                                                color: opt.color
                                            }
                                        })
                                    }}
                                />
                            ))}
                        </Stack>
                    )}
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
