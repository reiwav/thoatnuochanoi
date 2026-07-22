import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    CircularProgress, FormControl, InputLabel, Select, MenuItem, Stack, Box
} from '@mui/material';
import ReactApexChart from 'react-apexcharts';
import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import 'dayjs/locale/vi';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import useStationHistory, { getStationId } from './hooks/useStationHistory';

const StationHistory = ({ type }) => {
    const {
        loading,
        stations,
        selectedStation,
        selectedDate,
        setSelectedDate,
        history,
        handleStationChange,
        getTitle,
        getValueLabel,
        activeData,
        chartOptions,
        chartSeries
    } = useStationHistory({ type });

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
