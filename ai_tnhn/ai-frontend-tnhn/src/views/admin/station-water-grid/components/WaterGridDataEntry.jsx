import React from 'react';
import { Box, Typography, Button, CircularProgress, Tabs, Tab } from '@mui/material';
import { IconDeviceFloppy, IconRipple, IconDroplets } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import PermissionGuard from 'ui-component/PermissionGuard';
import useWaterGridDataEntry from '../hooks/useWaterGridDataEntry';
import GridFilterToolbar from './GridFilterToolbar';
import GridTable from './GridTable';

const WaterGridDataEntry = () => {
    const {
        loading,
        saving,
        mode,
        setMode,
        stepCycle,
        setStepCycle,
        selectedDate,
        setSelectedDate,
        stationTypeFilter,
        setStationTypeFilter,
        riverCount,
        lakeCount,
        flexibleSlots,
        groupedStations,
        gridValues,
        activeEditOrgs,
        toggleOrgEditMode,
        handleCellChange,
        saveSingleCell,
        getCellThresholdStatus
    } = useWaterGridDataEntry();

    return (
        <PermissionGuard permission="water:view" fallback={<Box sx={{ p: 3, textAlign: 'center' }}><Typography color="error" variant="h4">Bạn không có quyền truy cập vùng dữ liệu này.</Typography></Box>}>
            <MainCard
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>
                            NHẬP DỮ LIỆU GRID EXCEL MỰC NƯỚC
                        </Typography>
                    </Box>
                }
                secondary={
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                            value={stationTypeFilter}
                            onChange={(e, val) => setStationTypeFilter(val)}
                            textColor="primary"
                            indicatorColor="primary"
                            sx={{ minHeight: 40 }}
                        >
                            <Tab 
                                value="river" 
                                icon={<IconRipple size={18} />} 
                                iconPosition="start" 
                                label={`Sông (${riverCount})`} 
                                sx={{ fontWeight: 700, minHeight: 40 }}
                            />
                            <Tab 
                                value="lake" 
                                icon={<IconDroplets size={18} />} 
                                iconPosition="start" 
                                label={`Hồ (${lakeCount})`} 
                                sx={{ fontWeight: 700, minHeight: 40 }}
                            />
                        </Tabs>
                    </Box>
                }
            >
                {/* Control Toolbar */}
                <GridFilterToolbar
                    mode={mode}
                    setMode={setMode}
                    stepCycle={stepCycle}
                    setStepCycle={setStepCycle}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                />

                {/* Table Component */}
                <GridTable
                    loading={loading}
                    mode={mode}
                    flexibleSlots={flexibleSlots}
                    groupedStations={groupedStations}
                    gridValues={gridValues}
                    getCellThresholdStatus={getCellThresholdStatus}
                    activeEditOrgs={activeEditOrgs}
                    toggleOrgEditMode={toggleOrgEditMode}
                    handleCellChange={handleCellChange}
                    saveSingleCell={saveSingleCell}
                />
            </MainCard>
        </PermissionGuard>
    );
};

export default WaterGridDataEntry;
