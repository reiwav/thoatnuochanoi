import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Box, CircularProgress, Typography, useTheme
} from '@mui/material';
import ReactApexChart from 'react-apexcharts';
import dayjs from 'dayjs';

const RainChartDialog = ({ open, onClose, stationName, date, data, loading }) => {
    const theme = useTheme();

    const rainData = React.useMemo(() => {
        if (!data || data.length === 0) return [];
        return [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }, [data]);

    const stats = React.useMemo(() => {
        if (!rainData || rainData.length === 0) return null;

        let max = 0;
        rainData.forEach(item => {
            if (item.value > max) max = item.value;
        });

        return {
            max: max.toFixed(1),
            startTime: dayjs(rainData[0].timestamp).format('HH:mm'),
            endTime: dayjs(rainData[rainData.length - 1].timestamp).format('HH:mm')
        };
    }, [rainData]);

    const chartOptions = {
        chart: {
            type: 'line',
            height: 350,
            toolbar: { show: true },
            zoom: { enabled: true },
            fontFamily: theme.typography.fontFamily
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        dataLabels: { enabled: false },
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeUTC: false,
                format: 'HH:mm'
            },
            title: { text: 'Thời gian' }
        },
        yaxis: {
            title: { text: 'Lượng mưa (mm)' },
            min: 0
        },
        tooltip: {
            x: { format: 'HH:mm dd/MM/yyyy' }
        },
        colors: [theme.palette.primary.main],
        title: {
            text: `Biểu đồ lượng mưa - ${stationName}`,
            align: 'center',
            style: { fontSize: '16px', fontWeight: 700 }
        },
        subtitle: {
            text: `Ngày: ${dayjs(date).format('DD/MM/YYYY')}`,
            align: 'center'
        }
    };

    const chartSeries = [{
        name: 'Lượng mưa',
        data: rainData.map(item => ({
            x: new Date(item.timestamp).getTime(),
            y: item.value || 0
        }))
    }];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
        >
            <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" component="span" sx={{ fontWeight: 800 }}>
                    Biểu đồ lượng mưa
                </Typography>
                {stats && !loading && (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                                Lượng mưa:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                {stats.max}mm
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                                Thời gian:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                {stats.startTime} - {stats.endTime}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ minHeight: 350, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', pt: 2 }}>
                    {loading ? (
                        <CircularProgress />
                    ) : rainData.length > 0 ? (
                        <Box sx={{ width: '100%' }}>
                            <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={350} />
                        </Box>
                    ) : (
                        <Typography color="text.secondary">Không có dữ liệu mưa (hoặc không mưa) trong ngày này.</Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} variant="contained" sx={{ borderRadius: '8px' }}>Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};

export default RainChartDialog;
