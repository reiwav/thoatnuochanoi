import React from 'react';
import dayjs from 'dayjs';
import {
    Box, Stack, ToggleButtonGroup, ToggleButton, FormControl, InputLabel, Select, MenuItem, Button, Tooltip
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { IconRotateClockwise } from '@tabler/icons-react';
import 'dayjs/locale/vi';

const GridFilterToolbar = ({
    mode,
    setMode,
    stepCycle,
    setStepCycle,
    selectedDate,
    setSelectedDate
}) => {
    return (
        <Box sx={{ mb: 2.5 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" flexWrap="wrap">
                    {/* Mode Toggle */}
                    <ToggleButtonGroup
                        value={mode}
                        exclusive
                        onChange={(e, val) => val && setMode(val)}
                        size="small"
                        color="primary"
                        sx={{ bgcolor: 'action.hover', borderRadius: '10px' }}
                    >
                        <ToggleButton value="fixed" sx={{ fontWeight: 700, px: 2 }}>
                            TH1: Cố định (6h30 / 13h30 / Hiện tại)
                        </ToggleButton>
                        <ToggleButton value="flexible" sx={{ fontWeight: 700, px: 2 }}>
                            TH2: Chu kỳ linh hoạt
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {/* Step cycle selector if flexible */}
                    {mode === 'flexible' && (
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel sx={{ fontWeight: 600 }}>Bước thời gian</InputLabel>
                            <Select
                                value={stepCycle}
                                label="Bước thời gian"
                                onChange={(e) => setStepCycle(e.target.value)}
                                sx={{ borderRadius: '10px' }}
                            >
                                <MenuItem value="5m">5 phút</MenuItem>
                                <MenuItem value="10m">10 phút</MenuItem>
                                <MenuItem value="15m">15 phút</MenuItem>
                                <MenuItem value="20m">20 phút</MenuItem>
                                <MenuItem value="30m">30 phút</MenuItem>
                                <MenuItem value="1h">1 giờ</MenuItem>
                                <MenuItem value="2h">2 giờ</MenuItem>
                            </Select>
                        </FormControl>
                    )}

                    {/* Date Time Picker & Quick Reset Button */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                            <DateTimePicker
                                label="Chọn mốc thời gian"
                                value={selectedDate}
                                onChange={(newValue) => newValue && setSelectedDate(newValue)}
                                format="DD/MM/YYYY HH:mm"
                                ampm={false}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        sx: { 
                                            width: 190,
                                            '& .MuiOutlinedInput-root': { borderRadius: '10px' }
                                        }
                                    }
                                }}
                            />
                        </LocalizationProvider>

                        <Tooltip title="Thiết lập nhanh về ngày giờ hiện tại">
                            <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                startIcon={<IconRotateClockwise size={16} />}
                                onClick={() => setSelectedDate(dayjs())}
                                sx={{ 
                                    height: 40, 
                                    borderRadius: '10px', 
                                    fontWeight: 700,
                                    px: 1.5,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Về hiện tại
                            </Button>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Stack>
        </Box>
    );
};

export default GridFilterToolbar;
