import { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, CircularProgress,
    Stack, Grid
} from '@mui/material';
import axiosClient from 'api/axiosClient';

const StationRainSummary = () => {
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [weatherData, setWeatherData] = useState([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/weather/rain');
            if (res.data?.status === 'success') {
                const raw = res.data.data;
                const tramList = raw.tram || [];
                const dataList = raw.data || [];

                setStations(tramList);
                setWeatherData(dataList);
            }
        } catch (err) {
            console.error('Lỗi tải dữ liệu bảng mưa:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 6 * 1000); // 6 seconds
        return () => clearInterval(interval);
    }, []);

    // Format date string from 2026-03-09T04:40:11 to HH:mm (DD/MM/YYYY)
    const formatDateTime = (dateStr) => {
        if (!dateStr || dateStr === '-' || dateStr === '') return '...';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const DD = String(d.getDate()).padStart(2, '0');
            const MM = String(d.getMonth() + 1).padStart(2, '0');
            const YYYY = d.getFullYear();
            return `${hh}:${mm} (${DD}/${MM}/${YYYY})`;
        } catch (e) {
            return dateStr;
        }
    };

    const formatTimeOnly = (dateStr) => {
        if (!dateStr || dateStr === '-' || dateStr === '') return '...';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) {
                if (dateStr.length > 16) return dateStr.substring(11, 16);
                return dateStr;
            }
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
        } catch (e) {
            return dateStr;
        }
    }

    const getTableData = () => {
        const dataMap = new Map();
        weatherData.forEach(d => {
            const tid = typeof d.TramId === 'number' ? d.TramId.toString() : d.TramId;
            dataMap.set(tid, d);
        });

        return stations.map((station, index) => {
            const tid = typeof station.Id === 'number' ? station.Id.toString() : station.Id;
            const wd = dataMap.get(tid);

            let startTime = wd?.ThoiGian_BD || '-';
            let currentTime = wd?.ThoiGian_HT || '-';

            const rainCurrent = wd?.LuongMua_HT ?? 0;
            const rainStart = wd?.LuongMua_BD ?? 0;
            const rainSession = Math.max(0, rainCurrent - rainStart);

            let isRaining = rainSession > 0;
            if (isRaining && currentTime !== '-') {
                const dataTime = new Date(currentTime).getTime();
                if (!isNaN(dataTime)) {
                    const diffMinutes = (Date.now() - dataTime) / (1000 * 60);
                    if (diffMinutes > 5) {
                        isRaining = false;
                    }
                }
            }

            return {
                id: tid,
                stt: index + 1,
                name: station.TenTram,
                address: station.TenPhuong,
                startTimeRaw: startTime,
                currentTimeRaw: currentTime,
                startTime: formatDateTime(startTime),
                currentTime: formatDateTime(currentTime),
                timeStartOnly: formatTimeOnly(startTime),
                timeCurrentOnly: formatTimeOnly(currentTime),
                rainStart: rainStart,
                rainCurrent: rainCurrent,
                rainSession: rainSession,
                isRaining: isRaining
            };
        });
    };

    const tableData = getTableData();
    const rainingCount = tableData.filter(d => d.isRaining).length;
    const notRainingCount = tableData.length - rainingCount;

    return (
        <Box sx={{ width: '100%', bgcolor: '#4fc3f7', minHeight: '100vh', p: 3 }}>
            <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#4caf50', px: 4, py: 2, borderRadius: 4, boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'white' }} />
                    <Typography variant="h3" sx={{ color: 'white', fontWeight: 700, margin: 0, lineHeight: 1 }}>
                        Đang mưa: {rainingCount}
                    </Typography>
                </Box>

                <Typography variant="h2" sx={{ color: 'white', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, textShadow: '1px 1px 2px rgba(0,0,0,0.2)', textAlign: 'center', flexGrow: 1 }}>
                    TRẠM ĐO LƯỢNG MƯA TỰ ĐỘNG
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#f5f5f5', px: 4, py: 2, borderRadius: 4, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#9e9e9e' }} />
                    <Typography variant="h3" sx={{ color: '#424242', fontWeight: 700, margin: 0, lineHeight: 1 }}>
                        Không mưa: {notRainingCount}
                    </Typography>
                </Box>
            </Box>

            {loading && tableData.length === 0 ? (
                <Box display="flex" justifyContent="center" my={5}>
                    <CircularProgress color="inherit" sx={{ color: 'white' }} />
                </Box>
            ) : tableData.length === 0 ? (
                <Box display="flex" justifyContent="center" my={5}>
                    <Typography variant="h5" sx={{ color: 'white' }}>Không có dữ liệu</Typography>
                </Box>
            ) : (
                <Grid container spacing={3} alignItems="stretch">
                    {tableData.map((row) => (
                        <Grid item xs={12} sm={6} md={3} lg={3} xl={3} key={row.id}>
                            <Card sx={{
                                display: 'flex', flexDirection: 'column',
                                height: '100%', minWidth: 0, width: `220px`,
                                borderRadius: '4px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
                                }
                            }}>
                                <CardContent sx={{ textAlign: 'center', p: '16px !important', flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                                    <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 700, mb: 1, textTransform: 'uppercase', wordBreak: 'break-word' }}>
                                        {row.name}
                                    </Typography>

                                    <Typography variant="body2" sx={{ color: 'text.primary', mb: 2, wordBreak: 'break-word' }}>
                                        ({row.address})
                                    </Typography>

                                    <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mb: 3 }}>

                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: row.isRaining ? '#4caf50' : '#757575' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {row.isRaining ? 'Đang mưa' : 'Không mưa'}
                                        </Typography>
                                    </Stack>

                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', mb: 3 }}>
                                        {/* Decorative dots to match design slightly */}
                                        {row.rainSession === 0 && (
                                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mr: 1, opacity: 0.6 }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                                            </Stack>
                                        )}
                                        <Typography variant="h2" sx={{ color: row.isRaining ? '#f44336' : '#008842ff', fontWeight: 800, fontSize: '2.5rem', lineHeight: 1 }}>
                                            {row.rainSession.toFixed(1)}
                                        </Typography>
                                    </Box>

                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.8rem' }}>
                                        Bắt đầu: {row.startTime} <br /> Kết thúc: {row.currentTime}
                                    </Typography>


                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default StationRainSummary;
