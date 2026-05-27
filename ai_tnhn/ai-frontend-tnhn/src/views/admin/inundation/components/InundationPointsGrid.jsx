import React from 'react';
import { Box, Paper, Typography, Grid, CircularProgress } from '@mui/material';
import InundationDesktopStatCard from './InundationDesktopStatCard';

const InundationPointsGrid = ({
  loading,
  filteredPoints,
  onAction,
  onOpenViewer,
  onOpenDetail,
  onOpenHistory,
  navigate,
  basePath
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (filteredPoints.length === 0) {
    return (
      <Paper
        sx={{
          py: 6,
          textAlign: 'center',
          borderRadius: 4,
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: 'grey.50'
        }}
      >
        <Typography color="textSecondary">Không tìm thấy điểm ngập</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ px: { xs: 1, sm: 0 } }}>
      <Grid container spacing={2}>
        {filteredPoints.map((point) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={point.id} sx={{ display: 'flex' }}>
            <InundationDesktopStatCard
              point={point}
              onAction={onAction}
              onOpenViewer={onOpenViewer}
              onOpenDetail={onOpenDetail}
              onOpenHistory={onOpenHistory}
              navigate={navigate}
              basePath={basePath}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default InundationPointsGrid;
