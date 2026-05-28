import React from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';

const MonthlyCompareTable = ({
    reportData,
    loading,
    months,
    year1,
    year2,
    formatPercent
}) => {
    return (
        <TableContainer component={Paper} elevation={0} sx={{
            borderRadius: 4,
            border: '1px solid #e0e0e0',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
            mb: 4
        }}>
            <Table size="small" sx={{
                '& .MuiTableCell-root': { borderRight: '1px solid #eee', borderBottom: '1px solid #eee', py: 1.5 },
                minWidth: 'max-content'
            }}>
                <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fb' }}>
                        <TableCell align="center" sx={{
                            fontWeight: 800,
                            color: '#37474f',
                            minWidth: 80,
                            position: 'sticky',
                            left: 0,
                            zIndex: 11,
                            bgcolor: '#f8f9fb'
                        }}>Tháng</TableCell>
                        {reportData?.stations?.sort().map(st => (
                            <TableCell key={st} align="center" sx={{ fontWeight: 800, color: '#37474f', fontSize: '0.85rem' }}>{st}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {months.map(m => (
                        <TableRow key={m} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#fafbfc' } }}>
                            <TableCell align="center" sx={{
                                fontWeight: 700,
                                color: '#3949ab',
                                position: 'sticky',
                                  left: 0,
                                zIndex: 10,
                                bgcolor: 'inherit'
                            }}>{m}</TableCell>
                            {reportData?.stations?.map(st => {
                                const v1 = reportData.data[year1]?.[m]?.[st] || 0;
                                const v2 = reportData.data[year2]?.[m]?.[st] || 0;
                                const percent = formatPercent(v1, v2);
                                const hasData = percent !== '';
                                return (
                                    <TableCell key={st} align="center" sx={{
                                        fontSize: '0.85rem',
                                        color: hasData && percent !== '0%' ? '#2e7d32' : '#90a4ae',
                                        fontWeight: hasData && percent !== '0%' ? 600 : 400
                                    }}>
                                        {percent}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: '#eceff1', borderTop: '2px solid #cfd8dc', '& .MuiTableCell-root': { fontWeight: 900, color: '#263238', fontSize: '0.9rem' } }}>
                        <TableCell align="center" sx={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            bgcolor: 'inherit'
                        }}>% Năm</TableCell>
                        {reportData?.stations?.map(st => (
                            <TableCell key={st} align="center">
                                {formatPercent(reportData.annualTotals[year1]?.[st] || 0, reportData.annualTotals[year2]?.[st] || 0)}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableBody>
            </Table>
            {(!reportData || reportData.stations.length === 0) && !loading && (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                    <Typography color="text.secondary">Chưa có dữ liệu cho các năm đã chọn.</Typography>
                </Box>
            )}
        </TableContainer>
    );
};

export default MonthlyCompareTable;
