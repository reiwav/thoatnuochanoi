import React, { useState, useEffect, useCallback } from 'react';
import {
    Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, FormControl, InputLabel, Select, MenuItem, Stack, Box, Chip
} from '@mui/material';
import dayjs from 'dayjs';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import inundationApi from 'api/inundation';
import stationApi from 'api/station';

const InundationStationHistory = () => {
    const [loading, setLoading] = useState(false);
    const [points, setPoints] = useState([]);
    const [selectedPoint, setSelectedPoint] = useState('');
    const [history, setHistory] = useState([]);

    const loadPoints = useCallback(async () => {
        try {
            const res = await stationApi.inundation.getAll();
            if (res.data?.status === 'success') {
                const data = res.data.data || [];
                setPoints(data);
                if (data.length > 0) setSelectedPoint(data[0].id);
            }
        } catch (err) {
            console.error('Failed to load points:', err);
        }
    }, []);

    const loadHistory = useCallback(async () => {
        // For Inundation, history means reports at this point
        // We'll need to fetch all reports and filter by point_id client-side or add backend endpoint
        // For now, let's fetch all reports (already scoped to org) and filter
        if (!selectedPoint) return;
        setLoading(true);
        try {
            const res = await inundationApi.getAllReports();
            if (res.data?.status === 'success') {
                const allReports = res.data.data || [];
                setHistory(allReports.filter(r => r.point_id === selectedPoint));
            }
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedPoint]);

    useEffect(() => { loadPoints(); }, [loadPoints]);
    useEffect(() => { loadHistory(); }, [loadHistory]);

    return (
        <MainCard title="Lịch sử ngập lụt tại điểm">
            <Stack spacing={3}>
                <Box sx={{ maxWidth: '100%' }}>
                    <FormControl fullWidth>
                        <InputLabel sx={{ fontSize: '1rem', fontWeight: 600 }}>Chọn điểm ngập</InputLabel>
                        <Select
                            value={selectedPoint}
                            label="Chọn điểm ngập"
                            onChange={(e) => setSelectedPoint(e.target.value)}
                            sx={{ fontSize: '1rem' }}
                        >
                            {points.map((p) => (
                                <MenuItem key={p.id} value={p.id} sx={{ fontSize: '1rem', py: 1.5 }}>{p.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Bắt đầu</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Kết thúc</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Độ sâu</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Người báo</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                            ) : history.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Không có lịch sử bản tin tại điểm này</TableCell></TableRow>
                            ) : (
                                history.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableRow key={row.id} hover>
                                            <TableCell sx={{ fontSize: '0.95rem' }}>{dayjs.unix(row.start_time).format('DD/MM HH:mm')}</TableCell>
                                            <TableCell sx={{ fontSize: '0.95rem' }}>
                                                {row.end_time ? dayjs.unix(row.end_time).format('DD/MM HH:mm') : '-'}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'error.main' }}>{row.depth}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.status === 'active' ? 'Đang ngập' : 'Đã rút'}
                                                    color={row.status === 'active' ? 'error' : 'success'}
                                                    size="small"
                                                    sx={{ fontWeight: 800, fontSize: '0.8rem', height: 24 }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.9rem' }}>{row.user_email?.split('@')[0]}</TableCell>
                                        </TableRow>
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

export default InundationStationHistory;
