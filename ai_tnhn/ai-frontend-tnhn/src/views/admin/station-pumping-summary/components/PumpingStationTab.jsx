import React from 'react';
import { Grid, Skeleton, Paper, Typography } from '@mui/material';
import PumpingStationCard from '../../../employee/pumping-station/components/PumpingStationCard';

const PumpingStationTab = ({ stations, isLoading, onUpdate, onViewHistory }) => {
    if (isLoading && stations.length === 0) {
        return (
            <Grid container spacing={2}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <Grid size={{ xs: 12, sm: 4, md: 3 }} key={i}>
                        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 4 }} />
                    </Grid>
                ))}
            </Grid>
        );
    }

    if (stations.length === 0) {
        return (
            <Paper sx={{ textAlign: 'center', py: 10, borderRadius: 5, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="h4" color="textSecondary" sx={{ mb: 1, fontWeight: 800 }}>Không tìm thấy trạm bơm</Typography>
                <Typography variant="body2" color="text.disabled">Vui lòng thử lại với từ khóa khác</Typography>
            </Paper>
        );
    }

    return (
        <Grid container spacing={2} alignItems="stretch">
            {stations.map(station => (
                <Grid size={{ xs: 12, sm: 4, md: 3 }} key={station.id}>
                    <PumpingStationCard 
                        station={station} 
                        onUpdate={handleAction(onUpdate, station)} 
                        onViewHistory={handleAction(onViewHistory, station)}
                    />
                </Grid>
            ))}
        </Grid>
    );
};

// Helper to prevent event bubbling if needed, though cards handle their own clicks
const handleAction = (fn, data) => (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    fn && fn(data);
};

export default PumpingStationTab;
