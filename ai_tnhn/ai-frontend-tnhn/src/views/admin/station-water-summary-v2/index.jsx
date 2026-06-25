import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import useStationWaterSummaryV2 from './hooks/useStationWaterSummaryV2';
import WaterSummaryHeaderV2 from './components/WaterSummaryHeaderV2';
import WaterStationCardV2 from './components/WaterStationCardV2';

const StationWaterSummaryV2 = () => {
    const {
        loading,
        activeTab,
        setActiveTab,
        riverStationsCount,
        lakeStationsCount,
        filteredData
    } = useStationWaterSummaryV2();

    return (
        <Box sx={{
            width: '100%',
            background: 'linear-gradient(135deg, #1a237e 0%, #4fc3f7 100%)',
            minHeight: '100vh',
            p: { xs: 2, md: 4 }
        }}>
            <WaterSummaryHeaderV2
                tabValue={activeTab}
                handleTabChange={(e, v) => setActiveTab(v)}
                riverStationsLength={riverStationsCount}
                lakeStationsLength={lakeStationsCount}
            />

            {loading && filteredData.length === 0 ? (
                <Box display="flex" justifyContent="center" my={5}>
                    <CircularProgress size={40} thickness={4} sx={{ color: 'white' }} />
                </Box>
            ) : filteredData.length === 0 ? (
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
                    {filteredData.map((row) => (
                        <WaterStationCardV2 key={row.id} row={row} />
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default StationWaterSummaryV2;
