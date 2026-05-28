import React from 'react';
import { Box, Typography, Stack } from '@mui/material';

const SummaryHeader = ({ rainingCount, notRainingCount }) => {
    return (
        <Box sx={{
            mb: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3
        }}>
            <Typography
                variant="h1"
                sx={{
                    color: 'white',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: { xs: 1, md: 2 },
                    textAlign: 'center',
                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
            >
                Trạm đo lượng mưa tự động
            </Typography>

            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ width: '100%', justifyContent: 'center' }}
            >
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    bgcolor: 'rgba(76, 175, 80, 0.9)',
                    backdropFilter: 'blur(4px)',
                    px: 3,
                    py: 1.5,
                    borderRadius: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'white', animation: 'pulse 2s infinite' }} />
                    <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
                        Đang mưa: {rainingCount}
                    </Typography>
                </Box>

                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                    px: 3,
                    py: 1.5,
                    borderRadius: 3,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#9e9e9e' }} />
                    <Typography sx={{ color: '#424242', fontWeight: 700, fontSize: '1rem' }}>
                        Không mưa: {notRainingCount}
                    </Typography>
                </Box>
            </Stack>

            <style>
                {`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
                }
                `}
            </style>
        </Box>
    );
};

export default SummaryHeader;
