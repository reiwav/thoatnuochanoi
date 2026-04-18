import React from 'react';
import {
    Box, Typography, Stack, Avatar, Paper, Button, Grid, alpha
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconEngine, IconEdit, IconClock } from '@tabler/icons-react';

const PumpingStationCard = ({ station, onUpdate }) => {
    const theme = useTheme();
    const lastReport = station.last_report || {};

    const stats = [
        { label: 'Vận hành', value: lastReport.operating_count || 0, color: theme.palette.error.main, bg: alpha(theme.palette.error.main, 0.05) },
        { label: 'Dừng', value: lastReport.closed_count || 0, color: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.05) },
        { label: 'Bảo dưỡng', value: lastReport.maintenance_count || 0, color: '#FBC02D', bg: alpha('#FFEB3B', 0.1) },
        { label: 'Mất tín hiệu', value: lastReport.no_signal_count || 0, color: theme.palette.text.secondary, bg: 'grey.100' }
    ];

    return (
        <Paper
            elevation={2}
            sx={{
                p: 2.5,
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[10],
                    borderColor: 'primary.light'
                }
            }}
        >
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{
                        bgcolor: 'primary.lighter',
                        width: 56,
                        height: 56,
                        border: '1px solid',
                        borderColor: 'primary.light'
                    }}>
                        <IconEngine size={28} color={theme.palette.primary.main} />
                    </Avatar>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 900 }}>{station.name}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconClock size={14} color={theme.palette.text.secondary} />
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                {lastReport.created_at ? `Cập nhật: ${new Date(lastReport.created_at).toLocaleTimeString()}` : 'Chưa có báo cáo'}
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<IconEdit size={16} />}
                    onClick={() => onUpdate(station)}
                    sx={{
                        borderRadius: 2,
                        fontWeight: 800,
                        px: 2,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                    }}
                >
                    Cập nhật
                </Button>
            </Stack>

            <Grid container spacing={1.5}>
                {stats.map((s, idx) => (
                    <Grid item xs={3} key={idx}>
                        <Box sx={{
                            textAlign: 'center',
                            py: 1,
                            borderRadius: 2.5,
                            bgcolor: s.bg,
                            border: '1px solid',
                            borderColor: alpha(s.color, 0.1)
                        }}>
                            <Typography variant="h3" sx={{ fontWeight: 900, color: s.color }}>{s.value}</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: s.color, display: 'block', fontSize: '0.6rem', textTransform: 'uppercase' }}>
                                {s.label}
                            </Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {station.pump_count > 0 && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
                        Tổng số máy bơm: <b>{station.pump_count}</b>
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

export default PumpingStationCard;
