import React from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { IconRipple, IconDroplets } from '@tabler/icons-react';

const WaterSummaryHeaderV2 = ({ tabValue, handleTabChange, riverStationsLength, lakeStationsLength }) => {
    return (
        <Box>
            <Box sx={{
                mb: 1.5,
                display: 'flex',
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
                        fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.8rem' },
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                >
                    Hệ thống giám sát mực nước tự động
                </Typography>
            </Box>

            <Box sx={{ mb: 1.5 }}>
                <Paper elevation={6} sx={{ borderRadius: 2, p: 0.25, bgcolor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', maxWidth: 600, mx: 'auto' }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{
                            minHeight: 40,
                            '& .MuiTabs-indicator': {
                                height: '100%',
                                borderRadius: 1.5,
                                bgcolor: '#1a237e',
                                opacity: 0.1,
                                zIndex: 0
                            },
                            '& .MuiTabs-flexContainer': { position: 'relative', zIndex: 1 }
                        }}
                    >
                        <Tab
                            icon={<IconRipple size={18} />}
                            iconPosition="start"
                            label={`Sông (${riverStationsLength})`}
                            sx={{
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                minHeight: 40,
                                color: '#455a64',
                                '&.Mui-selected': { color: '#1a237e' }
                            }}
                        />
                        <Tab
                            icon={<IconDroplets size={18} />}
                            iconPosition="start"
                            label={`Hồ (${lakeStationsLength})`}
                            sx={{
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                minHeight: 40,
                                color: '#455a64',
                                '&.Mui-selected': { color: '#1a237e' }
                            }}
                        />
                    </Tabs>
                </Paper>
            </Box>
        </Box>
    );
};

export default WaterSummaryHeaderV2;
