import React from 'react';
import { Chip } from '@mui/material';

const StatusChip = ({ active }) => (
    <Chip
        label={active ? 'Hoạt động' : 'Ngừng'}
        color={active ? 'success' : 'default'}
        size="small"
        variant="outlined"
        sx={{ 
            fontWeight: 800, 
            fontSize: '0.75rem', 
            height: 24,
            px: 0.5,
            bgcolor: active ? 'success.light' : 'grey.100',
            borderColor: active ? 'success.main' : 'grey.400',
            color: active ? 'success.dark' : 'grey.600'
        }}
    />
);

export default React.memo(StatusChip);
