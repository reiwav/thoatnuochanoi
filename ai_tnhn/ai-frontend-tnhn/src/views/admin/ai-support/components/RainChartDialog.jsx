import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Box, CircularProgress, Typography, useTheme
} from '@mui/material';
import ReactApexChart from 'react-apexcharts';
import dayjs from 'dayjs';

const RainChartDialog = ({ open, onClose, stationName, date, data, loading }) => {
    const theme = useTheme();

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
        data: (data || []).map(item => ({
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
            <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
                Biểu đồ lượng mưa
            </DialogTitle>
            <DialogContent>
                <Box sx={{ minHeight: 350, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', pt: 2 }}>
                    {loading ? (
                        <CircularProgress />
                    ) : data && data.length > 0 ? (
                        <Box sx={{ width: '100%' }}>
                            <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={350} />
                        </Box>
                    ) : (
                        <Typography color="text.secondary">Không có dữ liệu mưa cho ngày này.</Typography>
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
