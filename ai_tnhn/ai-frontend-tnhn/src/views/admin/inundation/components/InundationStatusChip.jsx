import React from 'react';
import { Chip } from '@mui/material';

const InundationStatusChip = ({ isFlooding, floodLevelName }) => (
    <Chip 
        label={isFlooding ? (floodLevelName || 'Đang ngập') : 'Bình thường'} 
        size="small" 
        color={isFlooding ? 'error' : 'success'} 
        variant={isFlooding ? 'filled' : 'outlined'}
        sx={{ fontWeight: 800, height: 24 }}
    />
);

export default InundationStatusChip;
