import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
    Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, FormControl, InputLabel, Select, MenuItem, Stack, Box
} from '@mui/material';
import dayjs from 'dayjs';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import stationApi from 'api/station';

const StationHistory = ({ type }) => {
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState('');
    const [history, setHistory] = useState([]);

    const loadStations = useCallback(async () => {
        try {
            const apiMap = {
                rain: stationApi.rain,
                lake: stationApi.lake,
                river: stationApi.river
            };
            const res = await apiMap[type].getAll({ per_page: 1000 });
            if (res.data?.status === 'success') {
                const data = res.data.data.data || [];
                setStations(data);
                if (data.length > 0) setSelectedStation(data[0].id);
            }
        } catch (err) {
            console.error('Failed to load stations:', err);
        }
    }, [type]);

    const loadHistory = useCallback(async () => {
        if (!selectedStation) return;
        setLoading(true);
        try {
            const apiMap = {
                rain: stationApi.rain,
                lake: stationApi.lake,
                river: stationApi.river
            };
            const res = await apiMap[type].getHistory(selectedStation, { limit: 100 });
            if (res.data?.status === 'success') {
                setHistory(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoading(false);
        }
    }, [type, selectedStation]);

    useEffect(() => { loadStations(); }, [loadStations]);
    useEffect(() => { loadHistory(); }, [loadHistory]);

    const getTitle = () => {
        switch (type) {
            case 'rain': return 'Lịch sử đo mưa';
            case 'lake': return 'Lịch sử mực nước hồ';
            case 'river': return 'Lịch sử mực nước sông';
            default: return 'Lịch sử đo đạc';
        }
    };

    const getValueLabel = () => {
        switch (type) {
            case 'rain': return 'Lượng mưa (mm)';
            case 'lake': return 'Mực nước (m)';
            case 'river': return 'Mực nước (m)';
            default: return 'Giá trị';
        }
    };

    return (
        <MainCard title={getTitle()}>
            <Stack spacing={3}>
                <Box sx={{ maxWidth: 400 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Chọn trạm đo</InputLabel>
                        <Select
                            value={selectedStation}
                            label="Chọn trạm đo"
                            onChange={(e) => setSelectedStation(e.target.value)}
                        >
                            {stations.map((s) => (
                                <MenuItem key={s.id} value={s.id}>{s.TenTram}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Ngày</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{getValueLabel()}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}><CircularProgress size={24} color="secondary" /></TableCell></TableRow>
                            ) : history.length === 0 ? (
                                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>Không có dữ liệu lịch sử</TableCell></TableRow>
                            ) : (
                                history.map((row, index) => (
                                    <TableRow key={index} hover>
                                        <TableCell>{dayjs(row.timestamp).format('HH:mm:ss')}</TableCell>
                                        <TableCell>{dayjs(row.timestamp).format('DD/MM/YYYY')}</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{row.value}</TableCell>
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

export default StationHistory;
