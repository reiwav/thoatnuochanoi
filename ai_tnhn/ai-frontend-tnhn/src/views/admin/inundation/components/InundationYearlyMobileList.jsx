import React from 'react';
import { Box, Stack, Typography, Paper, Divider, Chip, Button, CircularProgress } from '@mui/material';

const InundationYearlyMobileList = ({
  loading,
  aggregatedData,
  year,
  onViewDetails,
  formatDuration
}) => {
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={30} color="secondary" />
        </Box>
      ) : aggregatedData.length === 0 ? (
        <Typography align="center" color="textSecondary" sx={{ py: 4 }}>
          Không có dữ liệu cho năm {year}
        </Typography>
      ) : (
        <Stack spacing={2}>
          {aggregatedData.map((row, index) => (
            <Paper
              key={row.point_id || row.street_name || index}
              sx={{
                p: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                    {row.street_name || row.point_id}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    {row.address || '...'}
                  </Typography>
                  <Typography variant="caption" color="secondary.main" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                    🏢 {row.org_name || row.org_code}
                  </Typography>
                </Box>
                <Chip label={`${row.count} lần`} color="error" size="small" sx={{ fontWeight: 800 }} />
              </Box>
              <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Thời gian ngập:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatDuration(row.total_duration)}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onViewDetails(row)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700
                  }}
                >
                  Chi tiết
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default InundationYearlyMobileList;
