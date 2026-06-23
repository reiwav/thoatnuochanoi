import React from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const SingleAssignmentSelector = ({
    title,
    label,
    value,
    onChange,
    items = [],
    labelField = 'name'
}) => {
    return (
        <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>{title}</Typography>
            <FormControl fullWidth size="small">
                <InputLabel>{label}</InputLabel>
                <Select
                    value={value || ''}
                    label={label}
                    onChange={(e) => onChange(e.target.value)}
                    sx={{ borderRadius: 3, fontWeight: 600 }}
                >
                    <MenuItem value=""><em>Không gán</em></MenuItem>
                    {(items || []).map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item[labelField]}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
};

export default SingleAssignmentSelector;
