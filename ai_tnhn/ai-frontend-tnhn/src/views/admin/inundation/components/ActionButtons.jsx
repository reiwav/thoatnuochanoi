import React from 'react';
import { Stack, Tooltip, IconButton } from '@mui/material';
import { IconSend, IconCircleCheck } from '@tabler/icons-react';
import PermissionGuard from 'ui-component/PermissionGuard';
import AdminInundationActionMenu from './AdminInundationActionMenu';

const ActionButtons = ({ point, onAction, navigate, basePath }) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        <PermissionGuard permission="inundation:report">
            <Tooltip title="Gửi báo cáo">
                <IconButton size="small" color="secondary" onClick={() => onAction('report', point)} sx={{ bgcolor: 'secondary.lighter' }}>
                    <IconSend size={18} />
                </IconButton>
            </Tooltip>
        </PermissionGuard>
        <PermissionGuard permission="inundation:review">
            <Tooltip title="Kết thúc nhanh">
                <IconButton 
                    size="small" color="success" 
                    disabled={!point.report_id}
                    onClick={() => onAction('quick_finish', point)} 
                    sx={{ bgcolor: 'success.lighter' }}
                >
                    <IconCircleCheck size={18} />
                </IconButton>
            </Tooltip>
        </PermissionGuard>
        <AdminInundationActionMenu 
            point={point} 
            onAction={onAction}
            onViewHistory={(p) => navigate(`${basePath}/station/inundation/history?id=${p.id}`)}
        />
    </Stack>
);

export default ActionButtons;
