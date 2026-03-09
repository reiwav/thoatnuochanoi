import React, { useState, useEffect } from 'react';
import {
    Box, Typography, CircularProgress, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    FormControl, Select, MenuItem, Button, Stack, Fade, Divider
} from '@mui/material';
import axiosClient from 'api/axiosClient';
import { IconFileSpreadsheet, IconChartBar, IconRefresh } from '@tabler/icons-react';
import * as XLSX from 'xlsx';

const StationRainCompare = () => {
    const [loading, setLoading] = useState(false);
    const [year1, setYear1] = useState(new Date().getFullYear());
    const [year2, setYear2] = useState(new Date().getFullYear() - 1);
    const [reportData, setReportData] = useState(null);

    const exportToExcel = () => {
        if (!reportData) return;

        const header = ['Tháng', ...reportData.stations.sort()];
        const rows = months.map(m => {
            const row = [m];
            reportData.stations.forEach(st => {
                const v1 = reportData.data[year1]?.[m]?.[st] || 0;
                const v2 = reportData.data[year2]?.[m]?.[st] || 0;
                row.push(formatPercent(v1, v2));
            });
            return row;
        });

        // Add Year total row for percentage
        const totalPercentRow = ['% Tổng Năm'];
        reportData.stations.forEach(st => {
            totalPercentRow.push(formatPercent(reportData.annualTotals[year1]?.[st] || 0, reportData.annualTotals[year2]?.[st] || 0));
        });
        rows.push(totalPercentRow);

        rows.push([]); // Empty row separator

        // Add Annual Summary Data
        rows.push(['Chi tiết tổng lượng mưa (mm)']);
        rows.push(['Năm', ...reportData.stations.sort()]);

        const rowYear1 = [`Năm ${year1}`];
        const rowYear2 = [`Năm ${year2}`];
        const rowDiff = ['Chênh lệch'];

        reportData.stations.sort().forEach(st => {
            const v1 = reportData.annualTotals[year1]?.[st] || 0;
            const v2 = reportData.annualTotals[year2]?.[st] || 0;
            const diff = v1 - v2;
            rowYear1.push(v1.toFixed(1));
            rowYear2.push(v2.toFixed(1));
            rowDiff.push((diff > 0 ? '+' : '') + diff.toFixed(1));
        });

        rows.push(rowYear1, rowYear2, rowDiff);

        const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'So Sanh Mua');
        XLSX.writeFile(workbook, `So_sanh_mua_${year1}_vs_${year2}.xlsx`);
    };

    const loadReport = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/weather/rain/compare?year1=${year1}&year2=${year2}`);
            if (res.data?.status === 'success') {
                setReportData(res.data.data);
            }
        } catch (err) {
            console.error('Lỗi tải báo cáo so sánh:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
    }, [year1, year2]);

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

    const formatPercent = (val1, val2) => {
        if (!val1 && !val2) return '';
        if (!val2) return val1 > 0 ? '100.0%' : '0%';
        return ((val1 / val2) * 100).toFixed(1) + '%';
    };

    return (
        <Box sx={{ p: 3, bgcolor: '#f4f7fa', minHeight: '100vh' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#1a237e', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconChartBar size={28} /> BÁO CÁO SO SÁNH LƯỢNG MƯA
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                        Thống kê và so sánh tỷ lệ lượng mưa giữa các năm theo trạm đo
                    </Typography>
                </Box>

                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#fff', border: '1px solid #e0e0e0', display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>So sánh:</Typography>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select
                                value={year1}
                                onChange={(e) => setYear1(e.target.value)}
                                sx={{ borderRadius: 2, fontWeight: 600 }}
                            >
                                {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>với:</Typography>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select
                                value={year2}
                                onChange={(e) => setYear2(e.target.value)}
                                sx={{ borderRadius: 2, fontWeight: 600 }}
                            >
                                {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                    <Divider orientation="vertical" flexItem />
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="contained"
                            disabled={loading}
                            onClick={loadReport}
                            startIcon={<IconRefresh size={18} />}
                            sx={{ borderRadius: 2, bgcolor: '#3949ab', boxShadow: 'none', '&:hover': { bgcolor: '#283593', boxShadow: '0 4px 12px rgba(57,73,171,0.2)' } }}
                        >
                            Duyệt báo cáo
                        </Button>
                        <Button
                            variant="outlined"
                            disabled={loading || !reportData}
                            onClick={exportToExcel}
                            startIcon={<IconFileSpreadsheet size={18} />}
                            sx={{ borderRadius: 2, border: '1px solid #e0e0e0', color: '#455a64', '&:hover': { bgcolor: '#f5f5f5', border: '1px solid #cfd8dc' } }}
                        >
                            Xuất Excel
                        </Button>
                    </Stack>
                </Paper>
            </Box>

            <Fade in={!loading}>
                <Box>
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

                    {reportData && reportData.stations.length > 0 && (
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
                    )}
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