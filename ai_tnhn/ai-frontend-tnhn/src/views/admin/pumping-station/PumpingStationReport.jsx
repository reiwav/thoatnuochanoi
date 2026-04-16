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

const PumpingStationReport = ({ station, onSuccess }) => {
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
            {/* Header Section */}
            <Paper
                elevation={0}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h2" sx={{ fontWeight: 900, mb: 0.5, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                            {station.name}
                        </Typography>
                    </Box>
                    <Avatar
                        sx={{
                            width: { xs: 64, sm: 80 },
                            height: { xs: 64, sm: 80 },
                            bgcolor: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <IconEngine size={40} />
                    </Avatar>
                </Stack>
            </Paper>

            {/* Status Grid */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                        <Typography variant="subtitle1" color="error.main" sx={{ fontWeight: 800, mb: 1 }}>Vận hành</Typography>
                        <Typography variant="h3" color="error.main" sx={{ fontWeight: 900, fontSize: '1rem' }}>{formData.operating_count}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                        <Typography variant="subtitle1" color="success.main" sx={{ fontWeight: 800, mb: 1 }}>Không vận hành</Typography>
                        <Typography variant="h3" color="success.main" sx={{ fontWeight: 900, fontSize: '1rem' }}>{formData.closed_count}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Paper elevation={0} sx={{
                        p: 1.5, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: '#FFEB3B', bgcolor: alpha('#FFEB3B', 0.1),
                        animation: 'status-blink 1s ease-in-out infinite'
                    }}>
                        <style>{`@keyframes status-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: '#FBC02D' }}>Bảo dưỡng</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, fontSize: '1rem', color: '#FBC02D' }}>{formData.maintenance_count}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'grey.400', bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 800, mb: 1 }}>Ko tín hiệu</Typography>
                        <Typography variant="h3" color="text.secondary" sx={{ fontWeight: 900, fontSize: '1rem' }}>{formData.no_signal_count}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Input Section */}
            <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <IconClock size={28} color={theme.palette.primary.main} />
                    Cập nhật báo cáo
                </Typography>

                <Grid container spacing={4}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            fullWidth
                            label="Số lượng vận hành"
                            name="operating_count"
                            value={formData.operating_count}
                            onChange={handleChange}
                            InputProps={{
                                sx: {
                                    borderRadius: 2,
                                    fontSize: '1rem',
                                    height: '40px'
                                }
                            }}
                        >
                            {getOptions('operating_count').map(num => (
                                <MenuItem key={num} value={num} sx={{ fontSize: '1rem' }}>{num} máy đang chạy</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            fullWidth
                            label="Số lượng không vận hành"
                            name="closed_count"
                            value={formData.closed_count}
                            onChange={handleChange}
                            InputProps={{
                                sx: {
                                    borderRadius: 2,
                                    fontSize: '1rem',
                                    height: '40px'
                                }
                            }}
                        >
                            {getOptions('closed_count').map(num => (
                                <MenuItem key={num} value={num} sx={{ fontSize: '1rem' }}>{num} không vận hành</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            fullWidth
                            label="Số lượng bảo dưỡng"
                            name="maintenance_count"
                            value={formData.maintenance_count}
                            onChange={handleChange}
                            InputProps={{
                                sx: {
                                    borderRadius: 2,
                                    fontSize: '1rem',
                                    height: '40px'
                                }
                            }}
                        >
                            {getOptions('maintenance_count').map(num => (
                                <MenuItem key={num} value={num} sx={{ fontSize: '1rem' }}>{num} máy bảo trì</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            fullWidth
                            label="Số lượng ko tín hiệu"
                            name="no_signal_count"
                            value={formData.no_signal_count}
                            onChange={handleChange}
                            InputProps={{
                                sx: {
                                    borderRadius: 2,
                                    fontSize: '1rem',
                                    height: '40px'
                                }
                            }}
                        >
                            {getOptions('no_signal_count').map(num => (
                                <MenuItem key={num} value={num} sx={{ fontSize: '1rem' }}>{num} máy ko tín hiệu</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            sx={{ mt: 2.5 }}
                            fullWidth
                            placeholder="Nhập ghi chú vận hành, sự cố kỹ thuật nếu có..."
                            name="note"
                            multiline
                            rows={4}
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            InputProps={{
                                sx: {
                                    borderRadius: 2,
                                    fontSize: '1rem',
                                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) }
                                }
                            }}
                        />
                    </Grid>

                </Grid>
                {remainingCount > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <IconAlertTriangle size={16} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            Còn <strong>{remainingCount}</strong> máy bơm chưa được phân loại trạng thái.
                        </Typography>
                    </Box>
                )}

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<IconCheck />}
                        onClick={handleSubmit}
                        disabled={totalPumped === 0}
                        sx={{
                            borderRadius: 2,
                            px: 5,
                            py: 1,
                            fontSize: '1rem',
                            bgcolor: theme.palette.primary.main,
                            textTransform: 'none',
                            '&:hover': {
                                bgcolor: theme.palette.primary.blue,
                                transform: 'translateY(-2px)'
                            },
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Gửi báo cáo vận hành
                    </Button>
                </Box>
            </Paper>
        </Box >
    );
};

export default PumpingStationReport;
