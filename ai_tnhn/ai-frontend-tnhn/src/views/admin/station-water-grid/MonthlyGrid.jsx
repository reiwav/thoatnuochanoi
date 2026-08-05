import React from 'react';
import { Box, Stack, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import 'dayjs/locale/vi';
import { IconRipple, IconDroplets, IconFileSpreadsheet } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import { useMonthlyGrid } from './hooks/useMonthlyGrid';
import MonthlyGridTable from './components/MonthlyGridTable';

const MonthlyGrid = () => {
    const {
        loading,
        daysInMonth,
        groupedStations,
        gridData,
        selectedMonth,
        setSelectedMonth,
        stationTypeFilter,
        setStationTypeFilter,
        selectedOrgId,
        setSelectedOrgId,
        orgOptions,
        saveSingleCell,
        handleExportExcel,
        exporting,
        riverCount,
        lakeCount
    } = useMonthlyGrid();

    return (
        <MainCard 
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>
                        NHẬP LIỆU 2 (THEO THÁNG)
                    </Typography>
                </Box>
            }
            secondary={
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={stationTypeFilter}
                        onChange={(e, val) => setStationTypeFilter(val)}
                        textColor="primary"
                        indicatorColor="primary"
                        sx={{ minHeight: 40 }}
                    >
                        <Tab 
                            value="river" 
                            icon={<IconRipple size={18} />} 
                            iconPosition="start" 
                            label={`Sông (${riverCount})`} 
                            sx={{ fontWeight: 700, minHeight: 40 }}
                        />
                        <Tab 
                            value="lake" 
                            icon={<IconDroplets size={18} />} 
                            iconPosition="start" 
                            label={`Hồ (${lakeCount})`} 
                            sx={{ fontWeight: 700, minHeight: 40 }}
                        />
                    </Tabs>
                </Box>
            }
        >
            <Stack spacing={3}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Box sx={{ minWidth: 200 }}>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                            <DatePicker
                                views={['month', 'year']}
                                openTo="month"
                                label="Chọn tháng/năm"
                                value={selectedMonth}
                                onChange={(newValue) => setSelectedMonth(newValue)}
                                format="MM/YYYY"
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true,
                                        sx: { 
                                            '& .MuiOutlinedInput-root': { borderRadius: '10px' },
                                            '& .MuiInputBase-input': { fontSize: '0.95rem', fontWeight: 600 }
                                        }
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </Box>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel sx={{ fontWeight: 600 }}>Xí nghiệp quản lý</InputLabel>
                        <Select
                            value={selectedOrgId}
                            label="Xí nghiệp quản lý"
                            onChange={(e) => setSelectedOrgId(e.target.value)}
                            sx={{ borderRadius: '10px', '& .MuiInputBase-input': { fontSize: '0.95rem', fontWeight: 600 } }}
                        >
                            <MenuItem value=""><em>Tất cả</em></MenuItem>
                            {orgOptions.map(org => (
                                <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        color="success"
                        size="small"
                        disabled={exporting}
                        startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <IconFileSpreadsheet size={18} />}
                        onClick={handleExportExcel}
                        sx={{ 
                            height: 40, 
                            borderRadius: '10px', 
                            fontWeight: 700,
                            px: 2,
                            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {exporting ? 'Đang tải...' : 'Tải Excel'}
                    </Button>
                    <Box sx={{ ml: 'auto' }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            * Lưu ý: Nhập liệu 2 khung giờ 6h30 và 13h30, dữ liệu tự động lưu khi bấm ra ngoài.
                        </Typography>
                    </Box>
                </Box>

                <MonthlyGridTable 
                    loading={loading}
                    daysInMonth={daysInMonth}
                    groupedStations={groupedStations}
                    gridData={gridData}
                    saveSingleCell={saveSingleCell}
                />
            </Stack>
        </MainCard>
    );
};

export default MonthlyGrid;
