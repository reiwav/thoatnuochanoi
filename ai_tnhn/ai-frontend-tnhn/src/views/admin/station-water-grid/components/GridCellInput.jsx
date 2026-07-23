import React, { useState, useEffect } from 'react';
import { TableCell, TextField, Typography, Box } from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';

const getCellTextColor = (status) => {
    if (status === 'high') return 'error.main'; // Red
    if (status === 'low') return 'warning.dark'; // Orange
    return 'primary.main'; // Smart primary color for numbers in edit mode
};

const getGlowColor = (status) => {
    if (status === 'high') return 'rgba(244, 67, 54, 0.25)';
    if (status === 'low') return 'rgba(255, 152, 0, 0.25)';
    return 'rgba(33, 150, 243, 0.25)';
};

const GridCellInput = React.memo(({ value, timeLabel, onChange, onBlur, placeholder, status, isT0, isGroupEditing }) => {
    const [localValue, setLocalValue] = useState(value || '');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setLocalValue(value || '');
        }
    }, [value, isEditing]);

    const handleChange = (e) => {
        const val = e.target.value;
        setLocalValue(val);
        if (onChange) onChange(val);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (onBlur) {
            onBlur(localValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        } else if (e.key === 'Escape') {
            setLocalValue(value || '');
            setIsEditing(false);
        }
    };

    const baseBorderColor = isT0 ? 'primary.main' : 'divider';
    const cellTextColor = getCellTextColor(status);
    const hasVal = value !== '' && value !== undefined && value !== null;

    // If Xí nghiệp switch is OFF -> Read-only plain cell
    if (!isGroupEditing) {
        return (
            <TableCell 
                align="center" 
                sx={{ 
                    fontWeight: 700, 
                    color: status === 'normal' ? 'inherit' : cellTextColor,
                    borderLeft: isT0 ? '2px solid' : '1px solid',
                    borderRight: isT0 ? '2px solid' : '1px solid',
                    borderColor: baseBorderColor,
                    py: timeLabel ? 0.6 : 1
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: status === 'normal' ? 'inherit' : cellTextColor }}>
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
    // If not actively editing this specific cell -> render smart interactive pill label
    if (!isEditing) {
        return (
            <TableCell 
                align="center"
                onClick={() => setIsEditing(true)}
                sx={{ 
                    borderLeft: isT0 ? '2px solid' : '1px solid',
                    borderRight: isT0 ? '2px solid' : '1px solid',
                    borderColor: baseBorderColor,
                    p: 0.5,
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                <Box
                    sx={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 1.2,
                        py: timeLabel ? 0.2 : 0.4,
                        borderRadius: '8px',
                        minWidth: 46,
                        bgcolor: hasVal ? 'rgba(33, 150, 243, 0.04)' : 'transparent',
                        border: '1px solid',
                        borderColor: hasVal ? 'rgba(33, 150, 243, 0.15)' : 'transparent',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '& .hover-pencil': {
                            opacity: 0,
                            transform: 'scale(0.75)',
                            transition: 'all 0.2s ease'
                        },
                        '&:hover': {
                            bgcolor: 'primary.light',
                            borderColor: 'primary.main',
                            boxShadow: '0 2px 8px rgba(33, 150, 243, 0.18)',
                            transform: 'translateY(-1px)',
                            '& .hover-pencil': {
                                opacity: 1,
                                transform: 'scale(1)'
                            }
                        }
                    }}
                >
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontWeight: 800, 
                                color: hasVal ? cellTextColor : 'text.secondary',
                                fontSize: '0.875rem'
                            }}
                        >
                            {hasVal ? value : '-'}
                        </Typography>
                        
                        <Box className="hover-pencil" sx={{ display: 'flex', alignItems: 'center', ml: -0.2 }}>
                            {hasVal ? (
                                <IconPencil size={13} style={{ color: '#1e88e5' }} />
                            ) : (
                                <IconPlus size={13} style={{ color: '#1e88e5' }} />
                            )}
                        </Box>
                    </Box>
                    {hasVal && timeLabel && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.68rem', lineHeight: 1, mt: 0.1 }}>
                            {timeLabel}
                        </Typography>
                    )}
                </Box>
            </TableCell>
        );
    }

    // Actively editing -> render focused smart TextField
    return (
        <TableCell 
            align="center" 
            sx={{ 
                borderLeft: isT0 ? '2px solid' : '1px solid',
                borderRight: isT0 ? '2px solid' : '1px solid',
                borderColor: 'primary.main',
                bgcolor: 'background.paper',
                p: 0.3
            }}
        >
            <TextField
                autoFocus
                size="small"
                type="number"
                placeholder={placeholder || '0.00'}
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onFocus={(e) => e.target.select()}
                slotProps={{ 
                    htmlInput: { 
                        step: 'any', 
                        style: { 
                            textAlign: 'center', 
                            fontWeight: 900, 
                            color: cellTextColor, 
                            padding: '4px 6px',
                            fontSize: '0.9rem'
                        } 
                    } 
                }}
                sx={{
                    width: '100%',
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        bgcolor: 'background.paper',
                        boxShadow: `0 0 0 3px ${getGlowColor(status)}`,
                        transition: 'all 0.2s ease',
                        '& fieldset': {
                            borderColor: 'primary.main',
                            borderWidth: '2px !important'
                        }
                    }
                }}
            />
        </TableCell>
    );
});

export default GridCellInput;
