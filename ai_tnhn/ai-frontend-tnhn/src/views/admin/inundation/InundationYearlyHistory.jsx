import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, FormControl, InputLabel, Select, MenuItem, Stack, Box, Button
} from '@mui/material';
import { IconFileExport } from '@tabler/icons-react';
import dayjs from 'dayjs';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import inundationApi from 'api/inundation';
import useAuthStore from 'store/useAuthStore';

const InundationYearlyHistory = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(dayjs().year());
    const [history, setHistory] = useState([]);

    const years = [];
    for (let y = dayjs().year(); y >= 2024; y--) {
        years.push(y);
    }

    const loadHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await inundationApi.getYearlyHistory(year);
            if (res.data?.status === 'success') {
                setHistory(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load yearly history:', err);
        } finally {
            setLoading(false);
        }
    }, [year]);

    const handleExport = async () => {
        try {
            const response = await inundationApi.exportYearlyHistory(year);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `lich_su_ngap_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    return (
        <MainCard title={<Typography variant="h3" align="center" sx={{ textTransform: 'uppercase', py: 1 }}>Xem số liệu theo năm</Typography>}>
            <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-start">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Chọn năm</InputLabel>
                        <Select
                            value={year}
                            label="Chọn năm"
                            onChange={(e) => setYear(e.target.value)}
                        >
                            {years.map((y) => (
                                <MenuItem key={y} value={y}>{y}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<IconFileExport size="1.2rem" />}
                        onClick={handleExport}
                        sx={{ borderRadius: '8px', boxShadow: 'none' }}
                    >
                        Xuất ra Excel
                    </Button>
                </Stack>

                <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '4px' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f0f0f0' }}>
                            <TableRow>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '60px', borderRight: '1px solid #ddd' }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>Điểm ngập lụt</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '100px', borderRight: '1px solid #ddd' }}>Đơn vị</TableCell>
                                <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>Địa điểm / Quận</TableCell>
                                <TableCell sx={{ fontWeight: 800, borderRight: '1px solid #ddd' }}>Bắt đầu ngập / Kích thước</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, width: '150px' }}>Thời gian ngập (phút)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={24} color="secondary" />
                                    </TableCell>
                                </TableRow>
                            ) : history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                        Không có dữ liệu cho năm {year}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((row, index) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell align="center" sx={{ borderRight: '1px solid #eee' }}>{index + 1}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #eee', fontWeight: 600 }}>{row.street_name || row.point_id}</TableCell>
                                        <TableCell align="center" sx={{ borderRight: '1px solid #eee' }}>{row.org_code}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #eee', fontSize: '0.85rem' }}>{row.address || '...'}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #eee' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {dayjs.unix(row.start_time).format('DD/MM/YYYY HH:mm:ss')}
                                            </Typography>
                                            <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>
                                                {row.length}x{row.width}x{row.depth}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 600 }}>
                                            {row.end_time ? Math.round((row.end_time - row.start_time) / 60) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Stack>
        </MainCard>
    );
};

export default InundationYearlyHistory;
