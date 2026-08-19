import React from 'react';
import { Chip, alpha, useTheme } from '@mui/material';

const HistoryStatusChip = ({ type, count = 0 }) => {
    const theme = useTheme();
    const numCount = Number(count) || 0;
    const hasCount = numCount > 0;

    const configMap = {
        operating: {
            color: theme.palette.error.main,
            bgcolor: alpha(theme.palette.error.main, 0.15),
            borderColor: alpha(theme.palette.error.main, 0.45),
            shadow: `0 2px 8px ${alpha(theme.palette.error.main, 0.2)}`
        },
        closed: {
            color: theme.palette.success.dark,
            bgcolor: alpha(theme.palette.success.main, 0.15),
            borderColor: alpha(theme.palette.success.main, 0.45),
            shadow: `0 2px 8px ${alpha(theme.palette.success.main, 0.2)}`
        },
        maintenance: {
            color: '#9E6800',
            bgcolor: alpha('#FBC02D', 0.22),
            borderColor: alpha('#FBC02D', 0.6),
            shadow: `0 2px 8px ${alpha('#FBC02D', 0.25)}`
        },
        no_signal: {
            color: theme.palette.grey[700],
            bgcolor: alpha(theme.palette.grey[600], 0.15),
            borderColor: alpha(theme.palette.grey[600], 0.4),
            shadow: `0 2px 8px ${alpha(theme.palette.grey[600], 0.15)}`
        }
    };

    const config = configMap[type] || configMap.no_signal;

    return (
        <Chip 
            label={numCount} 
            sx={{ 
                fontWeight: 900, 
                borderRadius: 2, 
                minWidth: 52,
                height: 34,
                fontSize: hasCount ? '1.1rem' : '0.95rem',
                letterSpacing: 0.5,
                transition: 'all 0.2s ease-in-out',
                ...(hasCount ? {
                    bgcolor: config.bgcolor,
                    color: config.color,
                    border: '1.5px solid',
                    borderColor: config.borderColor,
                    boxShadow: config.shadow
                } : {
                    bgcolor: 'grey.100',
                    color: 'text.secondary',
                    border: '1px solid',
                    borderColor: 'divider',
                    opacity: 0.75
                })
            }} 
        />
    );
};

export default HistoryStatusChip;
