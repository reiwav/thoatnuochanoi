import React from 'react';
import { Autocomplete, Checkbox, Chip, TextField, Typography } from '@mui/material';
import { IconSquare, IconCheckbox } from '@tabler/icons-react';

/**
 * A reusable multi-select component with checkboxes and "Select All" functionality.
 * 
 * @param {string} label - The label for the text field
 * @param {Array} options - Array of objects with id and name
 * @param {Array} value - Array of selected IDs
 * @param {Function} onChange - Callback function called with selected IDs
 * @param {string} placeholder - Placeholder text
 * @param {Object} sx - Style overrides for the Autocomplete component
 * @param {boolean} showSelectAll - Whether to show the "Select All" option (default: true)
 */
const MultiSelectCheckboxes = ({
    label,
    options = [],
    value = [],
    onChange,
    placeholder = 'Chọn...',
    sx = {},
    showSelectAll = true,
    size = 'medium',
    ...props
}) => {
    // Determine the selected objects from the list of IDs
    const selectedOptions = options.filter((opt) => (value || []).includes(opt.id));

    const handleToggleSelectAll = () => {
        if ((value || []).length === options.length) {
            onChange([]);
        } else {
            onChange(options.map((opt) => opt.id));
        }
    };

    const handleToggleOption = (newValue) => {
        const isSelectAllClicked = newValue.find((v) => v.id === 'select-all');
        if (isSelectAllClicked) {
            handleToggleSelectAll();
        } else {
            onChange(newValue.map((v) => v.id));
        }
    };

    const displayOptions = showSelectAll && options.length > 0 
        ? [{ id: 'select-all', name: 'Chọn tất cả' }, ...options] 
        : options;

    return (
        <Autocomplete
            multiple
            fullWidth
            disableCloseOnSelect
            size={size}
            options={displayOptions}
            getOptionLabel={(option) => option.name}
            value={selectedOptions}
            onChange={(event, newValue) => handleToggleOption(newValue)}
            renderOption={(props, option, { selected }) => {
                const { key, ...optionProps } = props;
                
                if (option.id === 'select-all') {
                    const isAllSelected = (value || []).length === options.length && options.length > 0;
                    return (
                        <li key={key} {...optionProps}>
                            <Checkbox
                                size="small"
                                checked={isAllSelected}
                                indeterminate={(value || []).length > 0 && (value || []).length < options.length}
                                style={{ marginRight: 8 }}
                            />
                            <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>{option.name}</Typography>
                        </li>
                    );
                }

                return (
                    <li key={key} {...optionProps}>
                        <Checkbox size="small" checked={selected} style={{ marginRight: 8 }} />
                        {option.name}
                    </li>
                );
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={selectedOptions.length === 0 ? placeholder : ''}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
            )}
            renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                    <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                        key={option.id}
                        size="small"
                        sx={{ borderRadius: '8px', fontWeight: 600 }}
                    />
                ))
            }
            sx={{
                ...sx
            }}
            {...props}
        />
    );
};

export default MultiSelectCheckboxes;
