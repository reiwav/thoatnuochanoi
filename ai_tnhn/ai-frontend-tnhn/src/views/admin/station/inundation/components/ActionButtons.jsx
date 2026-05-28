import React from 'react';
import { Stack, Tooltip, IconButton } from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';

const ActionButtons = ({ row, canEdit, canDelete, handleOpenEdit, handleDelete }) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        {canEdit && (
            <Tooltip title="Chỉnh sửa">
                <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                    <IconEdit size={20} />
                </IconButton>
            </Tooltip>
        )}
        {canDelete && (
            <Tooltip title="Xóa">
                <IconButton color="error" size="small" onClick={() => handleDelete(row)}>
                    <IconTrash size={20} />
                </IconButton>
            </Tooltip>
        )}
    </Stack>
);

export default ActionButtons;
