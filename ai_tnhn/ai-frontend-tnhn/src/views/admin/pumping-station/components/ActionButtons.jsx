import React from 'react';
import { Stack, Tooltip, IconButton } from '@mui/material';
import { IconHistory, IconEdit, IconTrash } from '@tabler/icons-react';

const ActionButtons = ({ item, type, hasPermission, isCompany, user, handleHistory, handleEdit, handleDelete }) => {
    const editPerm = type === 'pumping' ? 'trambom:edit' : 'wastewater:edit';
    const deletePerm = type === 'pumping' ? 'trambom:delete' : 'wastewater:delete';
    
    return (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title={type === 'pumping' ? "Lịch sử vận hành" : "Lịch sử báo cáo"}>
                <IconButton color="info" size="small" onClick={(e) => { e.stopPropagation(); handleHistory(item); }}>
                    <IconHistory size={20} />
                </IconButton>
            </Tooltip>
            {hasPermission(editPerm) && (isCompany || user?.org_id === item.org_id) && (
                <Tooltip title="Chỉnh sửa">
                    <IconButton color="primary" size="small" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                        <IconEdit size={20} />
                    </IconButton>
                </Tooltip>
            )}
            {hasPermission(deletePerm) && (isCompany || user?.org_id === item.org_id) && (
                <Tooltip title="Xóa">
                    <IconButton color="error" size="small" onClick={(e) => { e.stopPropagation(); handleDelete(item); }}>
                        <IconTrash size={20} />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    );
};

export default React.memo(ActionButtons);
