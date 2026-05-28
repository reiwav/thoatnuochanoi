import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import useStationWaterSummary from './hooks/useStationWaterSummary';
import WaterSummaryHeader from './components/WaterSummaryHeader';
import WaterStationCard from './components/WaterStationCard';

const StationWaterSummary = () => {
    const {
        loading,
        tabValue,
        handleTabChange,
        tableData,
        riverStations,
        lakeStations,
        activeData
    } = useStationWaterSummary();

    return (
        <Box sx={{
            width: '100%',
            background: 'linear-gradient(135deg, #1a237e 0%, #4fc3f7 100%)',
            minHeight: '100vh',
            p: { xs: 2, md: 4 }
        }}>
            <WaterSummaryHeader
                tabValue={tabValue}
                handleTabChange={handleTabChange}
                riverStationsLength={riverStations.length}
                lakeStationsLength={lakeStations.length}
            />

            {loading && tableData.length === 0 ? (
                <Box display="flex" justifyContent="center" my={5}>
                    <CircularProgress size={40} thickness={4} sx={{ color: 'white' }} />
                </Box>
            ) : activeData.length === 0 ? (
                <Box display="flex" justifyContent="center" my={5}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>Không có dữ liệu</Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',      
                            sm: 'repeat(3, 1fr)',      
                            md: 'repeat(6, 1fr)',      
                        },
                        gap: { xs: 1, md: 1.5 },
                        alignItems: 'stretch',
                        width: '100%'
                    }}
                >
                    {activeData.map((row) => (
                        <WaterStationCard key={row.id} row={row} />
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default StationWaterSummary;
