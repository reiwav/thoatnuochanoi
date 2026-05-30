import React from 'react';
import { Stack, Tooltip, IconButton } from '@mui/material';
import { IconSend, IconCircleCheck } from '@tabler/icons-react';
import PermissionGuard from 'ui-component/PermissionGuard';
import AdminInundationActionMenu from './AdminInundationActionMenu';

const ActionButtons = ({ point, onAction, navigate, basePath }) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        <PermissionGuard permission="inundation:report">
            <Tooltip title="Báo cáo của P.KT-CL">
                <IconButton size="small" color="secondary" onClick={() => onAction('report', point)} sx={{ bgcolor: 'secondary.lighter' }}>
                    <IconSend size={18} />
                </IconButton>
            </Tooltip>
        </PermissionGuard>
        <PermissionGuard permission="inundation:enterprise_report">
            {(() => {
                const isCorrection = point.report_id && point.last_report?.needs_correction && !point.last_report?.is_review_updated;
                return (
                    <Tooltip title={isCorrection ? "Chỉnh sửa lại điểm ngập" : "Báo cáo XN của địa bàn"}>
                        <IconButton
                            size="small"
                            color={isCorrection ? 'warning' : 'primary'}
                            onClick={() => onAction('report_enterprise', point)}
                            sx={{
                                bgcolor: isCorrection ? 'warning.lighter' : 'primary.lighter',
                                '&:hover': { bgcolor: isCorrection ? 'warning.light' : 'primary.light' }
                            }}
                        >
                            <IconSend size={18} />
                        </IconButton>
                    </Tooltip>
                );
            })()}
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
