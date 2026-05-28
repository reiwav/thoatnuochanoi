import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import useStationRainSummary from './hooks/useStationRainSummary';
import SummaryHeader from './components/SummaryHeader';
import RainStationCard from './components/RainStationCard';
import RainChartDialog from '../ai-support/components/RainChartDialog';

const StationRainSummary = () => {
    const {
        loading,
        tableData,
        rainingCount,
        notRainingCount,
        chartOpen,
        chartLoading,
        chartData,
        chartStationName,
        chartDate,
        handleOpenChart,
        handleCloseChart
    } = useStationRainSummary();

    return (
        <Box sx={{
            width: '100%',
            background: 'linear-gradient(135deg, #0288d1 0%, #4fc3f7 100%)',
            minHeight: '100vh',
            p: { xs: 2, md: 4 }
        }}>
            <SummaryHeader
                rainingCount={rainingCount}
                notRainingCount={notRainingCount}
            />

            {loading && tableData.length === 0 ? (
                <Box display="flex" justifyContent="center" my={10}>
                    <CircularProgress size={60} thickness={4} sx={{ color: 'white' }} />
                </Box>
            ) : tableData.length === 0 ? (
                <Box display="flex" justifyContent="center" my={10}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>Không có dữ liệu</Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',      // 2 cards per row on mobile
                            sm: 'repeat(3, 1fr)',      // 3 cards per row on small tablets
                            md: 'repeat(6, 1fr)',      // 6 cards per row on desktop
                        },
                        gap: { xs: 1, md: 1.5 },
                        alignItems: 'stretch',
                        width: '100%'
                    }}
                >
                    {tableData.map((row) => (
                        <RainStationCard 
                            key={row.id} 
                            row={row} 
                            onClick={() => handleOpenChart(row.id, row.name)}
                        />
                    ))}
                </Box>
            )}

            <RainChartDialog
                open={chartOpen}
                onClose={handleCloseChart}
                stationName={chartStationName}
                date={chartDate}
                data={chartData}
                loading={chartLoading}
            />
        </Box>
    );
};

export default StationRainSummary;
