import React from 'react';
import { Box, Card, CardContent, Typography, Tooltip } from '@mui/material';
import { IconCpu, IconPencil } from '@tabler/icons-react';

const WaterStationCard = ({ row }) => {
    const isHigh = row.thresholdStatus === 'high';
    const isLow = row.thresholdStatus === 'low';

    // Thay đổi màu sắc KHUNG theo trạng thái (Frame border & Shadow)
    let borderColor = '#2e7d32'; // Normal Green Border
    let boxShadow = '0 4px 12px rgba(46, 125, 50, 0.15)';
    let levelColor = '#1b5e20';
    let cardBg = '#ffffff';

    if (isHigh) {
        borderColor = '#d32f2f'; // Red Border
        boxShadow = '0 6px 18px rgba(211, 47, 47, 0.35)';
        levelColor = '#c62828';
        cardBg = '#fff5f5';
    } else if (isLow) {
        borderColor = '#ed6c02'; // Orange/Yellow Border
        boxShadow = '0 6px 18px rgba(237, 108, 2, 0.35)';
        levelColor = '#e65100';
        cardBg = '#fffdf5';
    }

    return (
        <Card sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            borderRadius: 3.5,
            boxShadow: boxShadow,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: `3px solid ${borderColor}`,
            bgcolor: cardBg,
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: isHigh 
                    ? '0 12px 24px rgba(211, 47, 47, 0.45)' 
                    : (isLow ? '0 12px 24px rgba(237, 108, 2, 0.45)' : '0 12px 24px rgba(0,0,0,0.18)'),
            }
        }}>
            <CardContent sx={{
                textAlign: 'center',
                p: { xs: 1, sm: 1.25, md: 1.5 },
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}>
                {/* Header: Auto Icon (nếu trạm tự động) */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: 22, mb: 0.5 }}>
                    {(row.dataMode === 'auto' || row.isAuto) && (
                        <Tooltip title="Tự động kết nối trạm đo (Auto)">
                            <Box sx={{ p: 0.5, borderRadius: '50%', bgcolor: 'info.light', display: 'inline-flex', color: 'info.main' }}>
                                <IconCpu size={16} />
                            </Box>
                        </Tooltip>
                    )}
                </Box>

                {/* Station Name */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography
                        variant="h5"
                        sx={{
                            color: '#1a237e',
                            fontWeight: 800,
                            mb: 0.25,
                            textTransform: 'uppercase',
                            lineHeight: 1.1,
                            fontSize: { xs: '0.78rem', sm: '0.85rem' },
                            minHeight: '2.2em',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {row.name}
                    </Typography>
                    <Box sx={{ minHeight: '2.2em', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#546e7a', fontWeight: 600, fontSize: '0.65rem', lineHeight: 1.1, textTransform: 'uppercase' }}>
                            {row.address}
                        </Typography>
                    </Box>
                </Box>

                {/* Water Level Display */}
                <Box sx={{ my: 0.5 }}>
                    <Typography
                        variant="h2"
                        sx={{
                            color: levelColor,
                            fontWeight: 900,
                            fontSize: { xs: '1.8rem', md: '2.2rem' },
                            lineHeight: 1,
                            fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif'
                        }}
                    >
                        {row.level > 0 ? row.level.toFixed(2) : '...'}
                    </Typography>
                </Box>

                {/* Footer Info: Time & Threshold Range */}
                <Box sx={{
                    mt: 'auto',
                    pt: 0.75,
                    borderTop: '1px dashed rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25
                }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#37474f', fontSize: '0.75rem' }}>
                        {row.time}
                    </Typography>
                    {(row.minThreshold > 0 || row.maxThreshold > 0) && (
                        <Tooltip title={`Ngưỡng cạn: ${row.minThreshold}m | Ngưỡng báo động: ${row.maxThreshold}m`}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#78909c', fontSize: '0.68rem' }}>
                                Ngưỡng: {row.minThreshold}m - {row.maxThreshold}m
                            </Typography>
                        </Tooltip>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default WaterStationCard;
