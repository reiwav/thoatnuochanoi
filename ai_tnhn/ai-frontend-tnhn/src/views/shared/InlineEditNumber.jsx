import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';

const InlineEditNumber = ({ 
    value, 
    placeholder, 
    onChange,
    onSave, 
    textColor,
    timeLabel = null,
    px = 1.2,
    py = 0.4,
    minWidth = '46px'
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value !== undefined && value !== null ? String(value) : '');
    const [initialValue, setInitialValue] = useState('');

    useEffect(() => {
        if (!isEditing) {
            setLocalValue(value !== undefined && value !== null ? String(value) : '');
        }
    }, [value, isEditing]);

    const handleStartEditing = () => {
        setIsEditing(true);
        setInitialValue(value !== undefined && value !== null ? String(value) : '');
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (localValue !== initialValue) {
            onSave(localValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        } else if (e.key === 'Escape') {
            setLocalValue(initialValue);
            setIsEditing(false);
        }
    };

    const hasVal = value !== undefined && value !== null && value !== '';

    if (isEditing) {
        return (
            <TextField
                autoFocus
                size="small"
                type="number"
                placeholder={placeholder}
                value={localValue}
                onChange={(e) => {
                    const val = e.target.value;
                    setLocalValue(val);
                    if (onChange) onChange(val);
                }}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onFocus={(e) => e.target.select()}
                slotProps={{ 
                    htmlInput: { 
                        step: 'any', 
                        style: { 
                            textAlign: 'center', 
                            fontWeight: 900, 
                            color: textColor || '#1e88e5', 
                            padding: '4px 6px',
                            fontSize: '0.85rem'
                        } 
                    } 
                }}
                sx={{
                    width: '100%',
                    minWidth: minWidth,
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        bgcolor: 'background.paper',
                        boxShadow: `0 0 0 2px rgba(33, 150, 243, 0.25)`,
                        transition: 'all 0.2s ease',
                        '& fieldset': {
                            borderColor: 'primary.main',
                            borderWidth: '2px !important'
                        }
                    }
                }}
            />
        );
    }

    const effectiveTextColor = textColor ? textColor : (hasVal ? 'primary.main' : 'text.secondary');

    return (
        <Box
            onClick={handleStartEditing}
            title={`Sửa ${placeholder || 'giá trị'}`}
            sx={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                px: px,
                py: timeLabel && hasVal ? py - 0.2 : py,
                borderRadius: '8px',
                width: '100%',
                minWidth: minWidth,
                bgcolor: hasVal ? 'rgba(33, 150, 243, 0.04)' : 'transparent',
                border: '1px solid',
                borderColor: hasVal ? 'rgba(33, 150, 243, 0.15)' : 'transparent',
                cursor: 'pointer',
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
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            fontWeight: 800, 
                            color: effectiveTextColor,
                            fontSize: '0.85rem'
                        }}
                    >
                        {hasVal ? value : '-'}
                    </Typography>
                    {hasVal && timeLabel && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.7rem', mt: -0.2 }}>
                            {timeLabel}
                        </Typography>
                    )}
                </Box>
                
                <Box className="hover-pencil" sx={{ display: 'flex', alignItems: 'center', ml: -0.2 }}>
                    {hasVal ? (
                        <IconPencil size={13} style={{ color: '#1e88e5' }} />
                    ) : (
                        <IconPlus size={13} style={{ color: '#1e88e5' }} />
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default InlineEditNumber;
