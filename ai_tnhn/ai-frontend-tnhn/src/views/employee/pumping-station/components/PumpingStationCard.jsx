import React, { useState } from 'react';
import dayjs from 'dayjs';
import {
    Box, Typography, Stack, Avatar, Paper, Grid, alpha,
    IconButton, Menu, MenuItem, ListItemIcon, ListItemText
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconEngine, IconEdit, IconClock, IconDotsVertical,
    IconHistory
} from '@tabler/icons-react';

const PumpingStationCard = ({ station, onUpdate, onViewHistory }) => {
    const theme = useTheme();
    const lastReport = station.last_report || {};
    const [anchorEl, setAnchorEl] = useState(null);
    const openMenu = Boolean(anchorEl);

    const handleOpenMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleAction = (action) => {
        handleCloseMenu();
        if (action === 'update' && onUpdate) {
            onUpdate(station);
        } else if (action === 'history' && onViewHistory) {
            onViewHistory(station);
        }
    };

    const stats = [
        { label: 'Vận hành', value: lastReport.operating_count || 0, color: theme.palette.error.main, bg: alpha(theme.palette.error.main, 0.05) },
        { label: 'Không VH', value: lastReport.closed_count || 0, color: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.05) },
        { label: 'Bảo dưỡng', value: lastReport.maintenance_count || 0, color: '#FBC02D', bg: alpha('#FFEB3B', 0.1) },
        { label: 'Mất tín hiệu', value: lastReport.no_signal_count || 0, color: theme.palette.text.secondary, bg: 'grey.100' }
    ];

    const totalStats = stats.reduce((acc, s) => acc + s.value, 0);

    return (
        <Paper
            elevation={2}
            sx={{
                p: 1.5,
                width: '100%',
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                minHeight: 300,
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[10],
                    borderColor: 'primary.light'
                }
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ overflow: 'hidden' }}>
                    <Avatar sx={{
                        bgcolor: 'primary.lighter',
                        width: 48,
                        height: 48,
                        border: '1px solid',
                        borderColor: 'primary.light',
                        flexShrink: 0
                    }}>
                        <IconEngine size={24} color={theme.palette.primary.main} />
                    </Avatar>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="h4" noWrap sx={{ fontWeight: 900, color: 'primary.main' }}>
                            {station.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconClock size={14} color={theme.palette.text.secondary} />
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                                {lastReport.timestamp ? dayjs(lastReport.timestamp * 1000).format('HH:mm - DD/MM') : 'Chưa có báo cáo'}
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>

                <Box>
                    <IconButton
                        id="station-action-button"
                        onClick={handleOpenMenu}
                        size="small"
                        sx={{ borderRadius: 2, bgcolor: 'grey.50' }}
                    >
                        <IconDotsVertical size={20} />
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={handleCloseMenu}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        <MenuItem onClick={() => handleAction('update')}>
                            <ListItemIcon><IconEdit size={18} /></ListItemIcon>
                            <ListItemText primary="Cập nhật" />
                        </MenuItem>
                        <MenuItem onClick={() => handleAction('history')}>
                            <ListItemIcon><IconHistory size={18} /></ListItemIcon>
                            <ListItemText primary="Lịch sử" />
                        </MenuItem>
                    </Menu>
                </Box>
            </Stack>

            {/* Visualize Progress Bar */}
            {station.pump_count > 0 && (
                <Box sx={{ height: 10, bgcolor: 'grey.100', borderRadius: 5, overflow: 'hidden', display: 'flex', mb: 2.5, border: '1px solid', borderColor: 'divider' }}>
                    {stats.map((s, i) => (
                        s.value > 0 && (
                            <Box
                                key={i}
                                sx={{
                                    width: `${(s.value / station.pump_count) * 100}%`,
                                    bgcolor: s.color,
                                    height: '100%',
                                    transition: 'width 0.5s ease'
                                }}
                            />
                        )
                    ))}
                    {station.pump_count > totalStats && (
                        <Box sx={{ width: `${((station.pump_count - totalStats) / station.pump_count) * 100}%`, bgcolor: 'transparent', height: '100%' }} />
                    )}
                </Box>
            )}

            <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: 1, 
                mt: 1,
                flexGrow: 1
            }}>
                {stats.map((s, idx) => (
                    <Box key={idx} sx={{
                        textAlign: 'center',
                        py: 1,
                        px: 0.5,
                        borderRadius: 3,
                        bgcolor: s.bg,
                        border: '1px solid',
                        borderColor: alpha(s.color, 0.15),
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        minHeight: 65
                    }}>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: s.color }}>{s.value}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: s.color, display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', mt: 0.2 }}>
                            {s.label}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {station.pump_count > 0 && (
                <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                        Định mức máy bơm
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>
                        {station.pump_count} máy
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

export default PumpingStationCard;
