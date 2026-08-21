import React, { useState } from 'react';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import {
    Box,
    CircularProgress,
    Typography,
    Container,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button
} from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import useWaterReportDetail from './hooks/useWaterReportDetail';

const WaterDetailTable = ({ data, reportTime, rainTime, title, loading }) => {
    return (
        <Box>
            <Box sx={{ mb: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Thời điểm báo cáo: {reportTime || '---'}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'error.main' }}>
                    Thời điểm bắt đầu mưa: {rainTime || '---'}
                </Typography>
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Table sx={{ minWidth: 650 }} aria-label={`${title} table`}>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'primary.light' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Tên Trạm</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Địa chỉ</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Thời gian<br/>trước mưa</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Mực nước<br/>trước mưa (m)</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Thời gian<br/>hiện tại</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Mực nước<br/>hiện tại (m)</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Chênh lệch (m)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    Không có dữ liệu
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, index) => (
                                <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                                        {row.station_name}
                                    </TableCell>
                                    <TableCell>{row.address}</TableCell>
                                    <TableCell align="center">{row.before_rain_time}</TableCell>
                                    <TableCell align="center">{row.before_rain_value}</TableCell>
                                    <TableCell align="center">{row.current_time}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                        {row.current_value}
                                    </TableCell>
                                    <TableCell align="center" sx={{ 
                                        fontWeight: 600, 
                                        color: row.raw_current - row.raw_before_rain > 0 ? 'error.main' : (row.raw_current - row.raw_before_rain < 0 ? 'success.main' : 'inherit')
                                    }}>
                                        {row.difference}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

const StationWaterReportDetail = () => {
    const { loading, data, refresh, selectedTime, setSelectedTime } = useWaterReportDetail();
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 3, pb: 4 }}>
            <MainCard
                title={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h3" sx={{ fontWeight: 800 }}>Dữ liệu trước mưa</Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DateTimePicker
                                    label="Thời điểm trước mưa"
                                    value={selectedTime}
                                    onChange={(newValue) => setSelectedTime(newValue)}
                                    format="DD/MM/YYYY HH:mm"
                                    ampm={false}
                                    slotProps={{ textField: { size: 'small', sx: { width: 220 } } }}
                                />
                            </LocalizationProvider>
                            <Button 
                                variant="contained" 
                                color="primary" 
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <IconSearch size={18} />} 
                                onClick={() => refresh(selectedTime ? selectedTime.unix() : null)}
                            >
                                Tìm kiếm
                            </Button>
                        </Box>
                    </Box>
                }
            >
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    sx={{
                        mb: 3,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '& .MuiTab-root': { fontWeight: 700, fontSize: '1rem', py: 1.5 }
                    }}
                >
                    <Tab label={`Mực nước Sông (${data.rivers?.length || 0})`} />
                    <Tab label={`Mực nước Hồ (${data.lakes?.length || 0})`} />
                </Tabs>

                {tabValue === 0 && (
                    <WaterDetailTable 
                        data={data.rivers || []} 
                        reportTime={data.report_time} 
                        rainTime={data.rain_time} 
                        title="Sông" 
                        loading={loading}
                    />
                )}
                
                {tabValue === 1 && (
                    <WaterDetailTable 
                        data={data.lakes || []} 
                        reportTime={data.report_time} 
                        rainTime={data.rain_time} 
                        title="Hồ" 
                        loading={loading}
                    />
                )}
            </MainCard>
        </Container>
    );
};

export default StationWaterReportDetail;
