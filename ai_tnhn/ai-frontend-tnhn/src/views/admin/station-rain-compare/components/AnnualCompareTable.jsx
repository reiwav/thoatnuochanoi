import React from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';

const AnnualCompareTable = ({
    reportData,
    year1,
    year2
}) => {
    if (!reportData || !reportData.stations || reportData.stations.length === 0) return null;

    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#37474f' }}>
                Chi tiết tổng lượng mưa (mm)
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{
                borderRadius: 4,
                border: '1px solid #e0e0e0',
                overflow: 'auto',
                boxShadow: '0 10px 40px rgba(0,0,0,0.03)'
            }}>
                <Table size="small" sx={{
                    '& .MuiTableCell-root': { borderRight: '1px solid #eee', borderBottom: '1px solid #eee', py: 1.5 },
                    minWidth: 'max-content'
                }}>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f8f9fb' }}>
                            <TableCell sx={{
                                fontWeight: 800,
                                minWidth: 100,
                                position: 'sticky',
                                left: 0,
                                zIndex: 11,
                                bgcolor: '#f8f9fb'
                            }}>Năm</TableCell>
                            {reportData.stations.sort().map(st => (
                                <TableCell key={st} align="center" sx={{ fontWeight: 800 }}>{st}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow hover>
                            <TableCell sx={{
                                fontWeight: 700,
                                position: 'sticky',
                                left: 0,
                                zIndex: 10,
                                bgcolor: '#fff'
                            }}>Năm {year1}</TableCell>
                            {reportData.stations.sort().map(st => (
                                <TableCell key={st} align="center">
                                    {(reportData.annualTotals[year1]?.[st] || 0).toFixed(1)}
                                </TableCell>
                            ))}
                        </TableRow>
                        <TableRow hover>
                            <TableCell sx={{
                                fontWeight: 700,
                                position: 'sticky',
                                left: 0,
                                zIndex: 10,
                                bgcolor: '#fff'
                            }}>Năm {year2}</TableCell>
                            {reportData.stations.sort().map(st => (
                                <TableCell key={st} align="center">
                                    {(reportData.annualTotals[year2]?.[st] || 0).toFixed(1)}
                                </TableCell>
                            ))}
                        </TableRow>
                        <TableRow sx={{ bgcolor: '#eceff1', '& .MuiTableCell-root': { fontWeight: 900 } }}>
                            <TableCell sx={{
                                position: 'sticky',
                                left: 0,
                                zIndex: 10,
                                bgcolor: 'inherit'
                            }}>Chênh lệch</TableCell>
                            {reportData.stations.sort().map(st => {
                                const v1 = reportData.annualTotals[year1]?.[st] || 0;
                                const v2 = reportData.annualTotals[year2]?.[st] || 0;
                                const diff = v1 - v2;
                                return (
                                    <TableCell key={st} align="center" sx={{ color: diff >= 0 ? '#d32f2f' : '#2e7d32' }}>
                                        {(diff > 0 ? '+' : '') + diff.toFixed(1)}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default AnnualCompareTable;
