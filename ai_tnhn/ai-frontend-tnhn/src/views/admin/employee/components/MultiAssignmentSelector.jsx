import React, { useState } from 'react';
import { Box, Stack, Typography, Button, Chip } from '@mui/material';
import SelectionDialog from './SelectionDialog';

const MultiAssignmentSelector = ({
    title,
    unitLabel,
    items = [],
    selectedIds = [],
    onConfirm,
    labelField = 'name'
}) => {
    const [open, setOpen] = useState(false);

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>{title}</Typography>
                    <Typography variant="caption" color="textSecondary">
                        {selectedIds.length > 0
                            ? `Đã chọn ${selectedIds.length} ${unitLabel}`
                            : `Chưa có ${unitLabel} nào được chọn`}
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    size="small"
                    color="secondary"
                    onClick={() => setOpen(true)}
                    sx={{ borderRadius: '8px', fontWeight: 700 }}
                >
                    Thay đổi
                </Button>
            </Stack>
            <Box sx={{
                display: 'flex', flexWrap: 'wrap', gap: 0.8,
                p: 1.5, border: '1px dashed', borderColor: 'divider',
                borderRadius: '12px', bgcolor: '#fdfdfd', minHeight: 48
            }}>
                {selectedIds.length === 0 ? (
                    <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>Chưa có {unitLabel} nào</Typography>
                ) : (
                    selectedIds.slice(0, 8).map((id) => {
                        const item = items.find(p => p.id === id);
                        return <Chip key={id} label={item ? item[labelField] : id} size="small" sx={{ fontWeight: 600 }} />;
                    })
                )}
                {selectedIds.length > 8 && (
                    <Chip label={`+${selectedIds.length - 8} mục nữa`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                )}
            </Box>

            <SelectionDialog
                open={open}
                onClose={() => setOpen(false)}
                title={title}
                items={items}
                labelField={labelField}
                initialSelectedIds={selectedIds}
                onConfirm={(newIds) => {
                    onConfirm(newIds);
                    setOpen(false);
                }}
                singleSelect={false}
            />
        </Box>
    );
};

export default MultiAssignmentSelector;
