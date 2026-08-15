import React from 'react';
import { TableCell, Typography, Box } from '@mui/material';
import InlineEditNumber from 'views/shared/InlineEditNumber';
import { getCellTextColor, getReadOnlyCellColor } from '../utils/gridHelpers';

const GridCellInput = React.memo(({ value, timeLabel, onChange, onBlur, placeholder, status, isT0, isGroupEditing }) => {
    const baseBorderColor = isT0 ? 'primary.main' : 'divider';
    const cellTextColor = getCellTextColor(status);
    const hasVal = value !== '' && value !== undefined && value !== null;
    const readOnlyColor = getReadOnlyCellColor(status, hasVal);

    // If Xí nghiệp switch is OFF -> Read-only plain cell
    if (!isGroupEditing) {
        return (
            <TableCell 
                align="center" 
                sx={{ 
                    fontWeight: 700, 
                    color: readOnlyColor,
                    borderLeft: isT0 ? '2px solid' : '1px solid',
                    borderRight: isT0 ? '2px solid' : '1px solid',
                    borderColor: baseBorderColor,
                    py: timeLabel ? 0.6 : 1
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: readOnlyColor }}>
                        {hasVal ? value : '-'}
                    </Typography>
                    {hasVal && timeLabel && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.7rem', mt: -0.2 }}>
                            {timeLabel}
                        </Typography>
                    )}
                </Box>
            </TableCell>
        );
    }

    // Xí nghiệp switch is ON:
    return (
        <TableCell 
            align="center"
            sx={{ 
                borderLeft: isT0 ? '2px solid' : '1px solid',
                borderRight: isT0 ? '2px solid' : '1px solid',
                borderColor: baseBorderColor,
                p: 0.5
            }}
        >
            <InlineEditNumber 
                value={value} 
                placeholder={placeholder || '0.00'}
                onChange={onChange}
                onSave={onBlur} // Only save to backend on blur
                textColor={cellTextColor}
                timeLabel={timeLabel}
                px={1.2}
                py={0.4}
                minWidth="46px"
            />
        </TableCell>
    );
});

export default GridCellInput;
