import React from 'react';
import { Chip, alpha, useTheme } from '@mui/material';

const HistoryStatusChip = ({ type, count = 0 }) => {
    const theme = useTheme();
    const numCount = Number(count) || 0;
    const hasCount = numCount > 0;

    const configMap = {
        operating: {
            color: theme.palette.error.main,
            bgcolor: alpha(theme.palette.error.main, 0.12),
            borderColor: alpha(theme.palette.error.main, 0.3)
        },
        closed: {
            color: theme.palette.success.dark,
            bgcolor: alpha(theme.palette.success.main, 0.12),
            borderColor: alpha(theme.palette.success.main, 0.3)
        },
        maintenance: {
            color: '#B78103',
            bgcolor: alpha('#FBC02D', 0.18),
            borderColor: alpha('#FBC02D', 0.4)
        },
        no_signal: {
            color: theme.palette.grey[700],
            bgcolor: alpha(theme.palette.grey[600], 0.15),
            borderColor: alpha(theme.palette.grey[600], 0.3)
        }
    };

    const config = configMap[type] || configMap.no_signal;

    return (
        <Chip 
            label={numCount} 
            size="small" 
            sx={{ 
                fontWeight: 900, 
                borderRadius: 2, 
                minWidth: 42,
                fontSize: '0.8rem',
                ...(hasCount ? {
                    bgcolor: config.bgcolor,
                    color: config.color,
                    border: '1px solid',
                    borderColor: config.borderColor
                } : {
                    bgcolor: 'grey.50',
                    color: 'text.disabled',
                    border: '1px solid',
                    borderColor: 'divider'
                })
            }} 
        />
    );
};

export default HistoryStatusChip;
