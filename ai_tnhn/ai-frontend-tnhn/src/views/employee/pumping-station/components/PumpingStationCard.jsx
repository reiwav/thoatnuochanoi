import React, { useState } from 'react';
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
        { label: 'Mất TH', value: lastReport.no_signal_count || 0, color: theme.palette.text.secondary, bg: 'grey.100' }
    ];

    const totalStats = stats.reduce((acc, s) => acc + s.value, 0);

    return (
        <Paper
            elevation={2}
            sx={{
                p: 3,
                width: '300px',
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[10],
                    borderColor: 'primary.light'
                }
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{
                        bgcolor: 'primary.lighter',
                        width: 52,
                        height: 52,
                        border: '1px solid',
                        borderColor: 'primary.light'
                    }}>
                        <IconEngine size={26} color={theme.palette.primary.main} />
                    </Avatar>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>{station.name}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconClock size={14} color={theme.palette.text.secondary} />
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                                {lastReport.created_at ? `${new Date(lastReport.created_at).toLocaleTimeString()}` : 'Chưa có báo cáo'}
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>

                <Box>
                    <IconButton
                        id="station-action-button"
                        aria-controls={openMenu ? 'station-action-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={openMenu ? 'true' : undefined}
                        onClick={handleOpenMenu}
                        size="small"
                        sx={{
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                            '&:hover': { bgcolor: 'grey.100' }
                        }}
                    >
                        <IconDotsVertical size={20} />
                    </IconButton>
                    <Menu
                        id="station-action-menu"
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={handleCloseMenu}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        sx={{
                            '& .MuiPaper-root': {
                                borderRadius: 2,
                                mt: 0.5,
                                minWidth: 150,
                                boxShadow: theme.shadows[8]
                            }
                        }}
                    >
                        <MenuItem onClick={() => handleAction('update')}>
                            <ListItemIcon>
                                <IconEdit size={18} color={theme.palette.primary.main} />
                            </ListItemIcon>
                            <ListItemText primary="Cập nhật" primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 700 }} />
                        </MenuItem>
                        <MenuItem onClick={() => handleAction('history')}>
                            <ListItemIcon>
                                <IconHistory size={18} color={theme.palette.info.main} />
                            </ListItemIcon>
                            <ListItemText primary="Lịch sử" primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 700 }} />
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
                                title={`${s.label}: ${s.value}`}
                            />
                        )
                    ))}
                    {station.pump_count > totalStats && (
                        <Box sx={{ width: `${((station.pump_count - totalStats) / station.pump_count) * 100}%`, bgcolor: 'transparent', height: '100%' }} />
                    )}
                </Box>
            )}

            <Grid container spacing={1.5} sx={{ flexGrow: 1 }}>
                {stats.map((s, idx) => (
                    <Grid item xs={6} sm={3} key={idx}>
                        <Box sx={{
                            textAlign: 'center',
                            py: 1.5,
                            px: 1,
                            borderRadius: 2.5,
                            bgcolor: s.bg,
                            border: '1px solid',
                            borderColor: alpha(s.color, 0.15)
                        }}>
                            <Typography variant="h3" sx={{ fontWeight: 900, color: s.color }}>{s.value}</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: s.color, display: 'block', fontSize: '0.62rem', textTransform: 'uppercase' }}>
                                {s.label}
                            </Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {station.pump_count > 0 && (
                <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
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
