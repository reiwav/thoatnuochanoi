import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

const RainStationCard = ({ row, onClick }) => {
    return (
        <Card 
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                borderRadius: 4,
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
                }
            }}
            onClick={onClick}
        >
            <CardContent sx={{
                textAlign: 'center',
                p: { xs: 1, sm: 1.5, md: 2 },
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography
                        variant="h5"
                        sx={{
                            color: '#1a237e',
                            fontWeight: 800,
                            mb: 0.5,
                            textTransform: 'uppercase',
                            lineHeight: 1.1,
                            fontSize: { xs: '0.8rem', sm: '0.9rem' },
                            minHeight: '2.2em',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {row.name}
                    </Typography>

                    <Box sx={{ minHeight: '2.2em', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                        {row.isRaining ? (
                            <Box sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: 'rgba(211, 47, 47, 0.1)'
                            }}>
                                <Box sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    bgcolor: '#d32f2f'
                                }} />
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#d32f2f', fontSize: '0.65rem' }}>
                                    ĐANG MƯA
                                </Typography>
                            </Box>
                        ) : (
                            <Typography variant="caption" sx={{ color: '#546e7a', fontWeight: 600, fontSize: '0.65rem', lineHeight: 1.1, textTransform: 'uppercase' }}>
                                {row.address}
                            </Typography>
                        )}
                    </Box>
                </Box>

                <Box sx={{ my: 0.5 }}>
                    <Typography
                        variant="h2"
                        sx={{
                            color: row.isRaining ? '#d32f2f' : '#1b5e20',
                            fontWeight: 900,
                            fontSize: { xs: '1.8rem', md: '2.2rem' },
                            lineHeight: 1,
                            fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif'
                        }}
                    >
                        {row.rainSession > 0 ? row.rainSession.toFixed(1) : '...'}
                    </Typography>
                </Box>

                <Box sx={{
                    mt: 'auto',
                    pt: 1,
                    borderTop: '1px dashed rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5
                }}>
                    <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                        <span>Bắt đầu:</span>
                        <span style={{ fontWeight: 600, color: '#333' }}>{row.timeStartOnly || '...'}</span>
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                        <span>Kết thúc:</span>
                        <span style={{ fontWeight: 600, color: '#333' }}>{row.timeCurrentOnly || '...'}</span>
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

export default RainStationCard;
