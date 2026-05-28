import React from 'react';
import { Stack, Tooltip, IconButton } from '@mui/material';
import { IconHistory, IconEdit, IconTrash } from '@tabler/icons-react';

const ActionButtons = ({ item, hasPermission, isCompany, user, handleHistory, handleEdit, handleDelete }) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        <Tooltip title="Lịch sử báo cáo">
            <IconButton color="info" size="small" onClick={() => handleHistory(item)}>
                <IconHistory size={20} />
            </IconButton>
        </Tooltip>
        {hasPermission('sluice-gate:edit') && (isCompany || user?.org_id === item.org_id) && (
            <Tooltip title="Chỉnh sửa">
                <IconButton color="primary" size="small" onClick={() => handleEdit(item)}>
                    <IconEdit size={20} />
                </IconButton>
            </Tooltip>
        )}
        {hasPermission('sluice-gate:delete') && (isCompany || user?.org_id === item.org_id) && (
            <Tooltip title="Xóa">
                <IconButton color="error" size="small" onClick={() => handleDelete(item)}>
                    <IconTrash size={20} />
                </IconButton>
            </Tooltip>
        )}
    </Stack>
);

export default ActionButtons;
