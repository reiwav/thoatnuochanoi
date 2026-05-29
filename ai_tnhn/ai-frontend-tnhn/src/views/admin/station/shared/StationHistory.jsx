import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, Typography, FormControl, InputLabel, Select, MenuItem, Stack, Box, TextField
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ReactApexChart from 'react-apexcharts';
import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import 'dayjs/locale/vi';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import stationApi from 'api/station';

const getStationId = (s) => s?.OldId ?? s?.old_id ?? s?.OldID ?? s?.Id ?? s?.id ?? '';

const StationHistory = ({ type }) => {
    const theme = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    const stationIdParam = searchParams.get('id');

    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState('');
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [history, setHistory] = useState([]);

    const loadStations = useCallback(async () => {
        try {
            const apiMap = {
                rain: stationApi.rain,
                lake: stationApi.lake,
                river: stationApi.river
            };
            const res = await apiMap[type].getAll({ per_page: 1000 });
            if (res) {
                const data = res.tram || res.data || (Array.isArray(res) ? res : []);
                setStations(data);
                if (data.length > 0) {
                    const initialId = stationIdParam || getStationId(data[0]);
                    setSelectedStation(initialId);
                }
            }
        } catch (err) {
            console.error('Failed to load stations:', err);
        }
    }, [type, stationIdParam]);

    const handleStationChange = (e) => {
        const val = e.target.value;
        setSelectedStation(val);
        setSearchParams({ id: val });
    };

    const loadHistory = useCallback(async () => {
        if (!selectedStation) return;
        setLoading(true);
        setHistory([]); // Reset history when starting new fetch to avoid showing old data
        try {
            const apiMap = {
                rain: stationApi.rain,
                lake: stationApi.lake,
                river: stationApi.river
            };
            const params = { limit: 500 };
            if (selectedDate) {
                params.date = selectedDate.format('YYYY-MM-DD');
            }
            const res = await apiMap[type].getHistory(selectedStation, params);
            // Interceptor đã trả về data (mảng) trực tiếp
            if (res) {
                setHistory(Array.isArray(res) ? res : (res.data || []));
            }
        } catch (err) {
            console.error('Failed to load history:', err);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [type, selectedStation, selectedDate]);

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

    const activeData = React.useMemo(() => {
        if (!history || history.length === 0) return [];
        if (type !== 'rain') return [...history].reverse();
        
        const sorted = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        let firstIndex = -1;
        let lastIndex = -1;
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].value > 0) {
                if (firstIndex === -1) firstIndex = i;
                lastIndex = i;
            }
        }
        if (firstIndex === -1) return sorted; // Fallback to all sorted data (0mm) so the line chart renders a flat line instead of disappearing

        const start = Math.max(0, firstIndex - 1);
        const end = Math.min(sorted.length - 1, lastIndex + 1);
        return sorted.slice(start, end + 1);
    }, [history, type]);

    const chartOptions = React.useMemo(() => ({
        chart: {
            type: 'line',
            height: 350,
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: theme.typography.fontFamily
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        markers: {
            size: activeData.length <= 1 ? 5 : 0,
            strokeWidth: 2,
            hover: { size: 6 }
        },
        fill: {
            type: 'solid'
        },
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeUTC: false,
                format: 'HH:mm'
            },
            title: { text: 'Thời gian' }
        },
        yaxis: {
            title: { text: getValueLabel() }
        },
        tooltip: {
            x: { format: 'dd/MM/yyyy HH:mm' }
        },
        colors: [theme.palette.primary.main]
    }), [theme, type, activeData.length]);

    const chartSeries = React.useMemo(() => {
        let data = activeData.map(item => ({
            x: new Date(item.timestamp).getTime(),
            y: item.value || 0
        }));



        return [{
            name: getValueLabel(),
            data: data
        }];
    }, [activeData, type, selectedDate]);

    return (
        <MainCard title={getTitle()}>
            <Stack spacing={3}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 250, flexGrow: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel sx={{ fontSize: '1rem', fontWeight: 600 }}>Chọn trạm đo</InputLabel>
                            <Select
                                value={selectedStation}
                                label="Chọn trạm đo"
                                onChange={handleStationChange}
                                sx={{ fontSize: '1rem' }}
                            >
                                {stations.map((s) => {
                                    const stId = getStationId(s);
                                    return (
                                        <MenuItem key={s.id || stId} value={stId} sx={{ fontSize: '1rem', py: 1.5 }}>
                                            {s.TenTram} ({s.DiaChi || s.TenPhuong || ''})
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                    </Box>
                    <Box sx={{ minWidth: 200, flexGrow: 1 }}>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                            <DatePicker
                                label="Chọn ngày"
                                value={selectedDate}
                                onChange={(newValue) => setSelectedDate(newValue)}
                                format="DD/MM/YYYY"
                                disableFuture
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        sx: { '& .MuiInputBase-input': { fontSize: '1rem', fontWeight: 600 } }
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </Box>
                </Box>

                {!loading && activeData.length > 0 && (
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                        <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={350} />
                    </Box>
                )}

                <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Thời gian</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Ngày</TableCell>
                                <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>{getValueLabel()}</TableCell>
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
                                        <TableCell sx={{ fontSize: '1rem' }}>{dayjs(row.timestamp).format('HH:mm:ss')}</TableCell>
                                        <TableCell sx={{ fontSize: '1rem' }}>{dayjs(row.timestamp).format('DD/MM/YYYY')}</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.1rem' }}>{row.value}</TableCell>
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
