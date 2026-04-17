import React, { useState } from 'react';
import { Box, Typography, Chip, Stack, IconButton, Collapse, Paper, Grid, Divider, Avatar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconChevronUp, IconChevronDown, IconUser } from '@tabler/icons-react';
import { formatDateTime } from 'utils/dataHelper';

const PumpingStationCard = ({ station, navigate, basePath }) => {
    const [open, setOpen] = useState(false);
    const lastReport = station.last_report;
    const theme = useTheme();

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                mb: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 4,
                bgcolor: 'background.paper',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
                transition: 'all 0.3s ease'
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: lastReport ? 1 : 0, gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography
                        variant="h4"
                        onClick={() => navigate(`${basePath}/inundation?activeTab=1&assignedStationId=${station.id}`)}
                        sx={{
                            fontWeight: 900,
                            color: 'primary.dark',
                            mb: 1,
                            lineHeight: 1.2,
                            cursor: 'pointer',
                            '&:hover': { color: 'primary.main' }
                        }}
                    >
                        {station.name}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        <Chip
                            label={`${station.pump_count} máy bơm`}
                            size="small"
                            sx={{ fontWeight: 800, bgcolor: 'primary.lighter', color: 'primary.main', height: 24 }}
                        />
                        {lastReport ? (
                            <Chip
                                label={`Cập nhật: ${formatDateTime(lastReport.timestamp)}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 700, height: 24 }}
                            />
                        ) : (
                            <Chip
                                label="Chưa có báo cáo"
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{ fontWeight: 700, height: 24 }}
                            />
                        )}
                    </Stack>
                </Box>
                {lastReport && (
                    <IconButton size="small" onClick={() => setOpen(!open)} sx={{ mt: -0.5, bgcolor: open ? 'primary.lighter' : 'transparent' }}>
                        {open ? <IconChevronUp size={22} color={theme.palette.primary.main} /> : <IconChevronDown size={22} />}
                    </IconButton>
                )}
            </Box>

            <Collapse in={open} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 3, border: '1px solid', borderColor: 'grey.100' }}>
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="success.main" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>VẬN HÀNH</Typography>
                                <Typography variant="h3" sx={{ fontWeight: 900, color: 'success.main' }}>{lastReport?.operating_count || 0}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>KHÔNG VẬN HÀNH</Typography>
                                <Typography variant="h3" sx={{ fontWeight: 900, color: 'error.main' }}>{lastReport?.closed_count || 0}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="warning.main" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>BẢO DƯỠNG</Typography>
                                <Typography variant="h3" sx={{ fontWeight: 900, color: 'warning.main' }}>{lastReport?.maintenance_count || 0}</Typography>
                            </Box>
                        </Grid>

                        {(lastReport?.note || lastReport?.user_name) && (
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                                {lastReport?.note && (
                                    <Box sx={{ mb: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 0.5, textTransform: 'uppercase' }}>Ghi chú vận hành</Typography>
                                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary', bgcolor: 'white', p: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'grey.200' }}>
                                            "{lastReport.note}"
                                        </Typography>
                                    </Box>
                                )}
                                <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled' }}>
                                        Người báo cáo:
                                    </Typography>
                                    <Chip
                                        label={lastReport.user_name || lastReport.user_id}
                                        size="small"
                                        avatar={<Avatar sx={{ width: 16, height: 16, fontSize: '0.6rem' }}><IconUser size={10} /></Avatar>}
                                        sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                                    />
                                </Stack>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            </Collapse>
        </Paper>
    );
};

export default PumpingStationCard;
