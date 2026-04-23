import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Stack, Avatar, Skeleton, CircularProgress,
    Grid, TextField, useTheme
} from '@mui/material';
import { IconEngine, IconSearch } from '@tabler/icons-react';

import usePumpingStationStore from 'store/usePumpingStationStore';
import pumpingStationApi from 'api/pumpingStation';

// Components
import EmployeeActionDialog from '../../employee/components/EmployeeActionDialog';
import PumpingStationCard from '../../employee/pumping-station/components/PumpingStationCard';

const StationPumpingSummary = () => {
    const theme = useTheme();
    const { pumpingStations, loading, fetchPumpingStations } = usePumpingStationStore();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [taskDialog, setTaskDialog] = useState({ open: false, data: null });

    // Initial fetch
    useEffect(() => {
        fetchPumpingStations();
    }, []);

    // Polling every 10 seconds for real-time monitoring
    useEffect(() => {
        const interval = setInterval(() => {
            fetchPumpingStations();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        fetchPumpingStations();
    };

    const filteredStations = useMemo(() => {
        if (!searchQuery.trim()) return pumpingStations;
        const q = searchQuery.toLowerCase();
        return pumpingStations.filter(s => 
            s.name?.toLowerCase().includes(q) || 
            s.address?.toLowerCase().includes(q)
        );
    }, [pumpingStations, searchQuery]);

    return (
        <Box sx={{ px: 1.5, pt: 2, pb: 10 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main' }}>Bảng Trạm Bơm Giám Sát</Typography>
                <Avatar sx={{ bgcolor: 'secondary.lighter', width: 44, height: 44 }}>
                    <IconEngine size={24} color={theme.palette.secondary.main} />
                </Avatar>
            </Box>

            {/* Filter Bar */}
            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder="Tìm tên trạm, khu vực..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: <IconSearch size={20} style={{ marginRight: 12, opacity: 0.6 }} />,
                            sx: {
                                borderRadius: 4,
                                bgcolor: 'background.paper',
                                boxShadow: theme.shadows[1],
                                '&:hover': { boxShadow: theme.shadows[3] },
                                '& .MuiOutlinedInput-notchedOutline': { border: '1px solid', borderColor: 'divider' }
                            }
                        }
                    }}
                />
            </Box>

            {loading && pumpingStations.length === 0 ? (
                <Grid container spacing={2}>
                    {[1, 2, 3, 4].map(i => (
                        <Grid item xs={12} sm={6} key={i}>
                            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 4 }} />
                        </Grid>
                    ))}
                </Grid>
            ) : filteredStations.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h4" color="textSecondary" sx={{ mb: 1, fontWeight: 700 }}>Không tìm thấy trạm bơm</Typography>
                    <Typography variant="body2" color="textSecondary">Hãy thử tìm kiếm với từ khóa khác</Typography>
                </Box>
            ) : (
                <Grid container spacing={3} alignItems="stretch">
                    {filteredStations.map(station => (
                        <Grid item xs={12} sm={6} md={4} key={station.id}>
                            <PumpingStationCard 
                                station={station} 
                                onUpdate={(s) => setTaskDialog({ open: true, data: s })} 
                            />
                        </Grid>
                    ))}
                </Grid>
            )}

            <EmployeeActionDialog 
                open={taskDialog.open}
                mode="PUMPING"
                data={taskDialog.data}
                onClose={() => setTaskDialog({ ...taskDialog, open: false })}
                onFinished={() => {
                    setTaskDialog({ ...taskDialog, open: false });
                    handleRefresh();
                }}
            />
        </Box>
    );
};

export default StationPumpingSummary;
