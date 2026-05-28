import React from 'react';
import { Box, CircularProgress, Fade } from '@mui/material';
import useStationRainCompare from './hooks/useStationRainCompare';
import CompareHeader from './components/CompareHeader';
import MonthlyCompareTable from './components/MonthlyCompareTable';
import AnnualCompareTable from './components/AnnualCompareTable';

const StationRainCompare = () => {
    const {
        hasPermission,
        loading,
        year1,
        setYear1,
        year2,
        setYear2,
        reportData,
        months,
        years,
        formatPercent,
        exportToExcel,
        loadReport
    } = useStationRainCompare();

    return (
        <Box sx={{ p: 3, bgcolor: '#f4f7fa', minHeight: '100vh' }}>
            <CompareHeader
                year1={year1}
                setYear1={setYear1}
                year2={year2}
                setYear2={setYear2}
                years={years}
                loading={loading}
                reportData={reportData}
                hasPermission={hasPermission}
                loadReport={loadReport}
                exportToExcel={exportToExcel}
            />

            <Fade in={!loading}>
                <Box>
                    <MonthlyCompareTable
                        reportData={reportData}
                        loading={loading}
                        months={months}
                        year1={year1}
                        year2={year2}
                        formatPercent={formatPercent}
                    />

                    <AnnualCompareTable
                        reportData={reportData}
                        year1={year1}
                        year2={year2}
                    />
                </Box>
            </Fade>

            {loading && (
                <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 9999 }}>
                    <CircularProgress size={50} thickness={4} sx={{ color: '#3949ab' }} />
                </Box>
            )}
        </Box>
    );
};

export default StationRainCompare;