import React from 'react';
import { Paper, Stack, Avatar, Box, Typography, IconButton, alpha, useTheme, Tooltip } from '@mui/material';
import { IconDroplets, IconMapPin, IconClipboardText, IconHistory } from '@tabler/icons-react';
import dayjs from 'dayjs';

const WastewaterTreatmentCard = ({ station, onUpdate, onViewHistory }) => {
    const theme = useTheme();
    const lastReport = station.last_report || {};

    return (
        <Paper
            elevation={2}
            onClick={() => onViewHistory && onViewHistory(station)}
            sx={{
                p: 1.5,
                width: '100%',
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                    borderColor: 'secondary.light'
                }
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.2 }}>
                <Avatar sx={{
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    width: 48,
                    height: 48,
                    color: theme.palette.secondary.main,
                    border: '1px solid',
                    borderColor: 'secondary.light',
                    flexShrink: 0
                }}>
                    <IconDroplets size={24} />
                </Avatar>
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Typography variant="h4" noWrap sx={{ fontWeight: 900, color: 'text.primary' }}>{station.name}</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconMapPin size={14} color={theme.palette.text.secondary} />
                        <Typography variant="caption" color="textSecondary" noWrap sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                            {station.address || '...'}
                        </Typography>
                    </Stack>
                </Box>
            </Stack>

            <Box sx={{ flexGrow: 1, bgcolor: alpha(theme.palette.secondary.main, 0.03), p: 2, borderRadius: 2.5, border: '1px dashed', borderColor: 'secondary.light' }}>
                <Typography variant="caption" color="secondary" sx={{ fontWeight: 800, mb: 1, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>Báo cáo mới nhất</Typography>
                {lastReport.note ? (
                    <Box>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary', mb: 1.5, lineClamp: 4, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.85rem', lineHeight: 1.4 }}>
                            "{lastReport.note}"
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.7rem' }}>{lastReport.user_name}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', fontWeight: 600 }}>
                                {dayjs(lastReport.timestamp * 1000).format('HH:mm - DD/MM')}
                            </Typography>
                        </Stack>
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', py: 1 }}>Chưa có báo cáo vận hành</Typography>
                )}
            </Box>

            <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Tooltip title="Nhập báo cáo">
                    <IconButton 
                        size="small" 
                        onClick={(e) => { e.stopPropagation(); onUpdate && onUpdate(station); }} 
                        sx={{ color: 'success.main', bgcolor: 'success.lighter', '&:hover': { bgcolor: 'success.light', color: 'white' } }}
                    >
                        <IconClipboardText size={18} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Xem lịch sử">
                    <IconButton 
                        size="small" 
                        onClick={(e) => { e.stopPropagation(); onViewHistory && onViewHistory(station); }}
                        sx={{ color: 'info.main', bgcolor: 'info.lighter', '&:hover': { bgcolor: 'info.light', color: 'white' } }}
                    >
                        <IconHistory size={18} />
                    </IconButton>
                </Tooltip>
            </Box>
        </Paper>
    );
};

export default WastewaterTreatmentCard;
