import React from 'react';
import { Stack, Tooltip, IconButton } from '@mui/material';
import { IconTrash, IconEdit } from '@tabler/icons-react';

const ActionButtons = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete }) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        {canEdit && (
            <Tooltip title="Chỉnh sửa">
                <IconButton 
                    color="primary" 
                    size="small" 
                    onClick={() => handleOpenEdit(row)}
                    sx={{ '&:hover': { bgcolor: 'primary.light' } }}
                >
                    <IconEdit size={20} />
                </IconButton>
            </Tooltip>
        )}
        {canDelete && (
            <Tooltip title="Xóa">
                <IconButton 
                    color="error" 
                    size="small" 
                    onClick={() => handleDelete(row.id || row.Id)}
                    sx={{ '&:hover': { bgcolor: 'error.light' } }}
                >
                    <IconTrash size={20} />
                </IconButton>
            </Tooltip>
        )}
    </Stack>
);

export default React.memo(ActionButtons);
