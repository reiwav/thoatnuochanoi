import { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, CircularProgress,
    Stack, Grid, Tabs, Tab, Paper
} from '@mui/material';
import axiosClient from 'api/axiosClient';

import { IconRipple, IconDroplets } from '@tabler/icons-react';

const StationWaterSummary = () => {
    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [waterData, setWaterData] = useState([]);
    const [tabValue, setTabValue] = useState(0);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/admin/weather/water');
            if (res.data?.status === 'success') {
                const raw = res.data.data;
                const tramList = raw.tram || [];
                const dataList = raw.data || [];

                setStations(tramList);
                setWaterData(dataList);
            }
        } catch (err) {
            console.error('Lỗi tải dữ liệu bảng mực nước:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 6 * 1000); // 6 seconds
        return () => clearInterval(interval);
    }, []);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

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

    const getTableData = () => {
        const dataMap = new Map();
        waterData.forEach(d => {
            dataMap.set(d.TramId, d);
        });

        return stations.map((station, index) => {
            const wd = dataMap.get(station.Id);
            const level = wd?.ThuongLuu_HT ?? 0;
            const time = wd?.ThoiGian_HT || '-';

            return {
                id: station.Id,
                stt: index + 1,
                name: station.TenTram,
                type: station.Loai === "1" ? "Sông" : "Hồ",
                level: level,
                time: formatDateTime(time),
                rawTime: time
            };
        });
    };

    const tableData = getTableData();
    const riverStations = tableData.filter(d => d.type === "Sông");
    const lakeStations = tableData.filter(d => d.type === "Hồ");

    const activeData = tabValue === 0 ? riverStations : lakeStations;

    const renderGrid = (data) => (
        <Grid container spacing={3} sx={{ mt: 1 }}>
            {data.map((row) => (
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
                            <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 700, mb: 1, textTransform: 'uppercase', wordBreak: 'break-word', minHeight: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {row.name}
                            </Typography>

                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', my: 2 }}>
                                <Typography variant="h2" sx={{ color: '#008842ff', fontWeight: 800, fontSize: '2.5rem', lineHeight: 1 }}>
                                    {row.level.toFixed(2)}
                                </Typography>
                                <Typography variant="body2" sx={{ ml: 0.5, fontWeight: 700, color: 'text.secondary' }}></Typography>
                            </Box>

                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                                Cập nhật: <br /> {row.time}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );

    return (
        <Box sx={{ width: '100%', bgcolor: '#4fc3f7', minHeight: '100vh', p: 3 }}>
            <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Typography variant="h2" sx={{ color: 'white', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, textShadow: '1px 1px 2px rgba(0,0,0,0.2)', textAlign: 'center', flexGrow: 1 }}>
                    HỆ THỐNG GIÁM SÁT MỰC NƯỚC TỰ ĐỘNG
                </Typography>
            </Box>

            <Box sx={{ mb: 4 }}>
                <Paper elevation={3} sx={{ borderRadius: 3, p: 0.5, bgcolor: 'rgba(255, 255, 255, 0.95)', maxWidth: 600, mx: 'auto' }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{
                            minHeight: 48,
                            '& .MuiTabs-indicator': {
                                height: '100%',
                                borderRadius: 2.5,
                                bgcolor: '#1a237e',
                                opacity: 0.1,
                                zIndex: 0
                            },
                            '& .MuiTabs-flexContainer': { position: 'relative', zIndex: 1 }
                        }}
                    >
                        <Tab
                            icon={<IconRipple size={20} />}
                            iconPosition="start"
                            label={`Sông (${riverStations.length})`}
                            sx={{
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                minHeight: 48,
                                color: '#455a64',
                                '&.Mui-selected': { color: '#1a237e' }
                            }}
                        />
                        <Tab
                            icon={<IconDroplets size={20} />}
                            iconPosition="start"
                            label={`Hồ (${lakeStations.length})`}
                            sx={{
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                minHeight: 48,
                                color: '#455a64',
                                '&.Mui-selected': { color: '#1a237e' }
                            }}
                        />
                    </Tabs>
                </Paper>
            </Box>

            {loading && tableData.length === 0 ? (
                <Box display="flex" justifyContent="center" my={5}>
                    <CircularProgress color="inherit" sx={{ color: 'white' }} />
                </Box>
            ) : activeData.length === 0 ? (
                <Box display="flex" justifyContent="center" my={5}>
                    <Typography variant="h5" sx={{ color: 'white' }}>Không có dữ liệu</Typography>
                </Box>
            ) : (
                renderGrid(activeData)
            )}
        </Box>
    );
};

export default StationWaterSummary;
