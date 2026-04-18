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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: Number(value) });
    };

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

            if (totalPumped > station.pump_count) {
                toast.error(`Tổng số máy bơm (${totalPumped}) vượt quá định mức (${station.pump_count})`);
                return;
            }

            await pumpingStationApi.report(payload);
            toast.success('Gửi báo cáo thành công');

            // Nếu có hàm callback thì gọi để Dashboard refresh lại dữ liệu station mới nhất
            if (onSuccess) {
                onSuccess();
            } else {
                setFormData({ operating_count: 0, closed_count: 0, maintenance_count: 0, no_signal_count: 0, note: '' });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Báo cáo thất bại');
        }
    };

    // Helper to generate options based on availability
    const getOptions = (currentField) => {
        const othersSum = totalPumped - Number(formData[currentField]);
        const maxAvailable = station.pump_count - othersSum;
        return Array.from({ length: maxAvailable + 1 }, (_, i) => i);
    };

    return (
        <Box sx={{ width: '100%', mx: 'auto' }}>
            {/* Input Section */}
            <Box sx={{ pb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, color: 'primary.main' }}>
                    <IconClock size={24} />
                    Cập nhật vận hành
                </Typography>

                <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Số lượng vận hành"
                            name="operating_count"
                            value={formData.operating_count}
                            onChange={handleChange}
                            InputProps={{
                                sx: { borderRadius: 2 }
                            }}
                        >
                            {getOptions('operating_count').map(num => (
                                <MenuItem key={num} value={num}>{num} máy đang chạy</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Số lượng không vận hành"
                            name="closed_count"
                            value={formData.closed_count}
                            onChange={handleChange}
                            InputProps={{
                                sx: { borderRadius: 2 }
                            }}
                        >
                            {getOptions('closed_count').map(num => (
                                <MenuItem key={num} value={num}>{num} không vận hành</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Số lượng bảo dưỡng"
                            name="maintenance_count"
                            value={formData.maintenance_count}
                            onChange={handleChange}
                            InputProps={{
                                sx: { borderRadius: 2 }
                            }}
                        >
                            {getOptions('maintenance_count').map(num => (
                                <MenuItem key={num} value={num}>{num} máy bảo trì</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Số lượng ko tín hiệu"
                            name="no_signal_count"
                            value={formData.no_signal_count}
                            onChange={handleChange}
                            InputProps={{
                                sx: { borderRadius: 2 }
                            }}
                        >
                            {getOptions('no_signal_count').map(num => (
                                <MenuItem key={num} value={num}>{num} máy ko tín hiệu</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            placeholder="Nhập ghi chú vận hành, sự cố kỹ thuật nếu có..."
                            name="note"
                            multiline
                            rows={3}
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            InputProps={{
                                sx: {
                                    borderRadius: 2,
                                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                                }
                            }}
                        />
                    </Grid>
                </Grid>

                {remainingCount > 0 && (
                    <Box sx={{ mt: 2, p: 1, px: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: 'warning.dark', bgcolor: 'warning.light', borderRadius: 2, opacity: 0.8 }}>
                        <IconAlertTriangle size={16} />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Còn {remainingCount} máy bơm chưa được cập nhật trạng thái
                        </Typography>
                    </Box>
                )}
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
