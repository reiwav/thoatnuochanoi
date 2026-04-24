import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Grid,
    TextField,
    Button,
    Stack,
    Typography,
    Paper,
    MenuItem,
    Divider,
    IconButton,
    Avatar,
    Box as MuiBox
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
    IconEngine,
    IconAlertTriangle,
    IconHistory,
    IconCheck,
    IconClock,
    IconTool
} from '@tabler/icons-react';
import pumpingStationApi from 'api/pumpingStation';
import { toast } from 'react-hot-toast';
import PumpingStationHistoryDialog from './PumpingStationHistoryDialog';

const PumpingStationReport = ({ station, onSuccess, onClose }) => {
    const theme = useTheme();
    const [openHistory, setOpenHistory] = useState(false);
    const [formData, setFormData] = useState({
        operating_count: station.last_report?.operating_count || 0,
        closed_count: station.last_report?.closed_count || 0,
        maintenance_count: station.last_report?.maintenance_count || 0,
        no_signal_count: station.last_report?.no_signal_count || 0,
        note: station.last_report?.note || ''
    });

    // Cập nhật formData khi station thay đổi (ví dụ sau khi reload dữ liệu)
    useEffect(() => {
        if (station?.last_report) {
            setFormData({
                operating_count: station.last_report.operating_count || 0,
                closed_count: station.last_report.closed_count || 0,
                maintenance_count: station.last_report.maintenance_count || 0,
                no_signal_count: station.last_report.no_signal_count || 0,
                note: station.last_report.note || ''
            });
        }
    }, [station]);

    const totalPumped = useMemo(() => {
        return Number(formData.operating_count) + Number(formData.closed_count) + Number(formData.maintenance_count) + Number(formData.no_signal_count);
    }, [formData]);

    const remainingCount = station.pump_count - totalPumped;

    const handleAdjust = (name, delta) => {
        const newValue = Math.max(0, (formData[name] || 0) + delta);
        // Validation: total cannot exceed pump_count
        const othersSum = totalPumped - (formData[name] || 0);
        if (othersSum + newValue > station.pump_count) {
            toast.error(`Tổng số máy bơm không thể vượt quá định mức ${station.pump_count} máy`);
            return;
        }
        setFormData({ ...formData, [name]: newValue });
    };

    const renderCounter = (label, name, color) => (
        <Grid item xs={12}>
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: 3,
                bgcolor: alpha(color, 0.04),
                border: '1px solid',
                borderColor: alpha(color, 0.1)
            }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: color }}>{label}</Typography>
                    <Typography variant="caption" color="textSecondary">Báo cáo cuối: <b>{station.last_report?.[name] || 0}</b></Typography>
                </Box>
                
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <IconButton 
                        size="large" 
                        onClick={() => handleAdjust(name, -1)}
                        disabled={formData[name] <= 0}
                        sx={{ 
                            bgcolor: 'background.paper', 
                            border: '2px solid', 
                            borderColor: 'divider',
                            width: 50,
                            height: 50,
                            '&:hover': { bgcolor: 'grey.100' }
                        }}
                    >
                        <Typography variant="h3" sx={{ fontWeight: 900 }}>-</Typography>
                    </IconButton>
                    
                    <TextField
                        size="small"
                        value={formData[name]}
                        onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const othersSum = totalPumped - (formData[name] || 0);
                            if (othersSum + val <= station.pump_count) {
                                setFormData({ ...formData, [name]: Math.max(0, val) });
                            }
                        }}
                        slotProps={{
                            htmlInput: { style: { textAlign: 'center', fontWeight: 900, width: 50, fontSize: '1.5rem', padding: '0' } }
                        }}
                        sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                    />

                    <IconButton 
                        size="large" 
                        onClick={() => handleAdjust(name, 1)}
                        disabled={totalPumped >= station.pump_count}
                        sx={{ 
                            bgcolor: 'background.paper', 
                            border: '2px solid', 
                            borderColor: 'divider',
                            width: 50,
                            height: 50,
                            '&:hover': { bgcolor: 'grey.100' }
                        }}
                    >
                        <Typography variant="h3" sx={{ fontWeight: 900 }}>+</Typography>
                    </IconButton>
                </Stack>
            </Box>
        </Grid>
    );

    const handleSubmit = async () => {
        try {
            const payload = {
                station_id: station.id,
                operating_count: formData.operating_count,
                closed_count: formData.closed_count,
                maintenance_count: formData.maintenance_count,
                no_signal_count: formData.no_signal_count,
                note: formData.note
            };

            if (totalPumped !== station.pump_count) {
                toast.error(`Tổng số máy bơm (${totalPumped}) phải bằng định mức (${station.pump_count})`);
                return;
            }

            await pumpingStationApi.report(payload);
            toast.success('Gửi báo cáo thành công');

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Báo cáo thất bại');
        }
    };

    return (
        <Box sx={{ width: '100%', mx: 'auto' }}>
            <Box sx={{ pb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5, color: 'primary.main' }}>
                        <IconClock size={24} />
                        Cập nhật vận hành
                    </Typography>
                    <Box sx={{ bgcolor: 'primary.lighter', px: 1.5, py: 0.5, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main' }}>
                            Định mức: {station.pump_count} máy
                        </Typography>
                    </Box>
                </Stack>

                <Grid container spacing={1.5}>
                    {renderCounter('Số bơm vận hành', 'operating_count', theme.palette.error.main)}
                    {renderCounter('Số bơm không vận hành', 'closed_count', theme.palette.success.main)}
                    {renderCounter('Số bơm bảo dưỡng', 'maintenance_count', '#FBC02D')}
                    {renderCounter('Số bơm mất tín hiệu', 'no_signal_count', theme.palette.text.secondary)}
                    
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            placeholder="Nhập ghi chú vận hành, sự cố kỹ thuật nếu có..."
                            name="note"
                            multiline
                            rows={2}
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            sx={{ mt: 1 }}
                            slotProps={{
                                input: {
                                    sx: {
                                        borderRadius: 3,
                                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                                    }
                                }
                            }}
                        />
                    </Grid>
                </Grid>

                <Box sx={{ 
                    mt: 2, p: 1.5, 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    bgcolor: remainingCount === 0 ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1),
                    color: remainingCount === 0 ? 'success.dark' : 'warning.dark',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider'
                }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconAlertTriangle size={18} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {remainingCount === 0 ? 'Đã gán đủ trạng thái' : `Còn ${remainingCount} máy chưa gán`}
                        </Typography>
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                        {totalPumped} / {station.pump_count}
                    </Typography>
                </Box>
                <Stack direction="column" spacing={1.5} sx={{ mt: 3 }}>
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<IconCheck />}
                        onClick={handleSubmit}
                        disabled={totalPumped === 0}
                        sx={{
                            borderRadius: 2,
                            py: 1.2,
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            bgcolor: theme.palette.primary.main,
                            textTransform: 'none',
                            '&:hover': {
                                bgcolor: theme.palette.primary.dark,
                                transform: 'translateY(-2px)'
                            },
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Gửi báo cáo vận hành
                    </Button>
                    <Button
                        variant="outlined"
                        color="inherit"
                        fullWidth
                        onClick={onClose}
                        sx={{
                            borderRadius: 2,
                            py: 1.2,
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderColor: 'divider',
                            '&:hover': {
                                bgcolor: 'grey.100',
                                borderColor: 'grey.400'
                            }
                        }}
                    >
                        Đóng
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
};

export default PumpingStationReport;
