import React from 'react';
import { 
    Box, Typography, Stack, IconButton, Chip, 
    Button, Tooltip 
} from '@mui/material';
import { 
    IconArrowLeft, IconClock, IconEngine, 
    IconDroplets, IconMapPin, IconRefresh 
} from '@tabler/icons-react';

const HistoryHeader = ({ station, isPumping, loading, onBack, onRefresh }) => {
    return (
        <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems={{ xs: 'flex-start', sm: 'center' }} 
            justifyContent="space-between" 
            sx={{ mb: 3 }}
        >
            <Stack direction="row" spacing={2} alignItems="center">
                <IconButton 
                    onClick={onBack} 
                    sx={{ 
                        bgcolor: 'background.paper', 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'primary.lighter', color: 'primary.main' } 
                    }}
                >
                    <IconArrowLeft size={22} />
                </IconButton>
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: -0.5 }}>
                            {station?.name}
                        </Typography>
                        {isPumping && station?.pump_count !== undefined && (
                            <Chip 
                                icon={<IconEngine size={15} />}
                                label={`Tổng ${station.pump_count} máy bơm`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 800, borderRadius: 2 }}
                            />
                        )}
                        {!isPumping && (
                            <Chip 
                                icon={<IconDroplets size={15} />}
                                label="Trạm XLNT"
                                size="small"
                                color="secondary"
                                variant="outlined"
                                sx={{ fontWeight: 800, borderRadius: 2 }}
                            />
                        )}
                    </Stack>
                    <Typography 
                        variant="subtitle2" 
                        sx={{ color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
                    >
                        {station?.address ? (
                            <>
                                <IconMapPin size={15} /> {station.address}
                            </>
                        ) : (
                            <>
                                <IconClock size={15} /> Lịch sử báo cáo vận hành
                            </>
                        )}
                    </Typography>
                </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" alignSelf={{ xs: 'flex-end', sm: 'center' }}>
                <Tooltip title="Tải lại dữ liệu">
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={onRefresh}
                        disabled={loading}
                        startIcon={<IconRefresh size={16} />}
                        sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none' }}
                    >
                        Làm mới
                    </Button>
                </Tooltip>
            </Stack>
        </Stack>
    );
};

export default HistoryHeader;
