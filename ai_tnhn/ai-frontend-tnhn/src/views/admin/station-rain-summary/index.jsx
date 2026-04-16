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
            const rainSession = rainCurrent;

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
                name: station.TenPhuong,
                address: station.DiaChi,
                thuTu: station.ThuTu || 0,
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

    const tableData = getTableData().sort((a, b) => a.thuTu - b.thuTu);
    const rainingCount = tableData.filter(d => d.isRaining).length;
    const notRainingCount = tableData.length - rainingCount;

    return (
        <Box sx={{
            width: '100%',
            background: 'linear-gradient(135deg, #0288d1 0%, #4fc3f7 100%)',
            minHeight: '100vh',
            p: { xs: 2, md: 4 }
        }}>
            <Box sx={{
                mb: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3
            }}>
                <Typography
                    variant="h1"
                    sx={{
                        color: 'white',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: { xs: 1, md: 2 },
                        textAlign: 'center',
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                >
                    Trạm đo lượng mưa tự động
                </Typography>

                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{ width: '100%', justifyContent: 'center' }}
                >
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        bgcolor: 'rgba(76, 175, 80, 0.9)',
                        backdropFilter: 'blur(4px)',
                        px: 3,
                        py: 1.5,
                        borderRadius: 3,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'white', animation: 'pulse 2s infinite' }} />
                        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
                            Đang mưa: {rainingCount}
                        </Typography>
                    </Box>

                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(4px)',
                        px: 3,
                        py: 1.5,
                        borderRadius: 3,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#9e9e9e' }} />
                        <Typography sx={{ color: '#424242', fontWeight: 700, fontSize: '1rem' }}>
                            Không mưa: {notRainingCount}
                        </Typography>
                    </Box>
                </Stack>
            </Box>

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
                        <Card key={row.id} sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            width: '100%',
                            borderRadius: 4,
                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                            '&:hover': {
                                transform: 'translateY(-8px)',
                                boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
                            }
                        }}>
                            <CardContent sx={{
                                textAlign: 'center',
                                p: { xs: 1, sm: 1.5, md: 2 },
                                flexGrow: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}>
                                <Box>
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            color: '#0288d1',
                                            fontWeight: 800,
                                            mb: 0.5,
                                            textTransform: 'uppercase',
                                            lineHeight: 1.2,
                                            fontSize: { xs: '0.8rem', sm: '1rem' },
                                            minHeight: '2.4em',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {row.name}
                                    </Typography>
                                    {row.thuTu > 0 && (
                                        <Typography variant="caption" sx={{ color: '#ff6f00', fontWeight: 800, fontSize: '0.7rem' }}>
                                            Ưu tiên: {row.thuTu}
                                        </Typography>
                                    )}

                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'block',
                                            mb: 2,
                                            fontWeight: 500,
                                            fontStyle: 'italic',
                                            minHeight: '2.8em',
                                            lineHeight: 1.2
                                        }}
                                    >
                                        {row.address}
                                    </Typography>

                                    <Box sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 2,
                                        bgcolor: row.isRaining ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0,0,0,0.05)',
                                        mb: 1
                                    }}>
                                        <Box sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            bgcolor: row.isRaining ? '#4caf50' : '#9e9e9e',
                                            boxShadow: row.isRaining ? '0 0 8px #4caf50' : 'none'
                                        }} />
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontWeight: 700,
                                                color: row.isRaining ? '#2e7d32' : 'text.secondary',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            {row.isRaining ? 'Đang mưa' : 'Không mưa'}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ my: 1 }}>
                                    <Typography
                                        variant="h2"
                                        sx={{
                                            color: row.isRaining ? '#d32f2f' : '#1b5e20',
                                            fontWeight: 900,
                                            fontSize: { xs: '1.8rem', md: '2.2rem' },
                                            lineHeight: 1,
                                            fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif'
                                        }}
                                    >
                                        {row.rainSession > 0 ? row.rainSession.toFixed(1) : '...'}
                                    </Typography>
                                </Box>

                                <Box sx={{
                                    mt: 'auto',
                                    pt: 2,
                                    borderTop: '1px dashed rgba(0,0,0,0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.5
                                }}>
                                    <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                                        <span>Bắt đầu:</span>
                                        <span style={{ fontWeight: 600, color: '#333' }}>{row.timeStartOnly || '...'}</span>
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                                        <span>Kết thúc:</span>
                                        <span style={{ fontWeight: 600, color: '#333' }}>{row.timeCurrentOnly || '...'}</span>
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}
            <style>
                {`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
                }
                `}
            </style>
        </Box>
    );
};

export default StationRainSummary;
