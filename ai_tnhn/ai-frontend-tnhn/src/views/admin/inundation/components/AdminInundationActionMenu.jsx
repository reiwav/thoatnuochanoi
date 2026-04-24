import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider, useTheme, alpha, Typography } from '@mui/material';
import { 
    IconDotsVertical, 
    IconMessageDots, 
    IconReportMedical, 
    IconRulerMeasure, 
    IconTruck, 
    IconCircleCheck,
    IconHistory,
    IconPlus
} from '@tabler/icons-react';

import PermissionGuard from 'ui-component/PermissionGuard';

const AdminInundationActionMenu = ({ 
    point, 
    onAction,
    onViewHistory
}) => {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleClose = (e) => {
        if (e) e.stopPropagation();
        setAnchorEl(null);
    };

    const handleMenuClick = (action) => (e) => {
        e.stopPropagation();
        handleClose();
        onAction(action, point);
    };

    // Actions are only relevant if there's an active report
    const hasActiveReport = !!point.report_id;

    return (
        <>
            <IconButton
                size="small"
                onClick={handleClick}
                color={hasActiveReport ? "error" : "default"}
                sx={{ 
                    bgcolor: hasActiveReport ? alpha(theme.palette.error.main, 0.05) : 'transparent',
                    '&:hover': { bgcolor: hasActiveReport ? alpha(theme.palette.error.main, 0.1) : 'grey.100' }
                }}
            >
                <IconDotsVertical size={20} />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 3,
                            mt: 0.5,
                            minWidth: 180,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                        }
                    }
                }}
            >
                <PermissionGuard permission="inundation:review">
                    <MenuItem onClick={handleMenuClick('comment')}>
                        <ListItemIcon><IconMessageDots size={18} color={theme.palette.error.main} /></ListItemIcon>
                        <ListItemText 
                            primary={
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.main' }}>
                                    Nhận xét rà soát
                                </Typography>
                            } 
                        />
                    </MenuItem>
                </PermissionGuard>
                
                <PermissionGuard permission="inundation:report">
                    <MenuItem onClick={handleMenuClick('report')}>
                        <ListItemIcon><IconReportMedical size={18} color={theme.palette.secondary.main} /></ListItemIcon>
                        <ListItemText 
                            primary={
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                                    Cập nhật diễn biến
                                </Typography>
                            } 
                        />
                    </MenuItem>
                </PermissionGuard>

                <PermissionGuard permission="inundation:survey">
                    <MenuItem onClick={handleMenuClick('survey')}>
                        <ListItemIcon><IconRulerMeasure size={18} color={theme.palette.primary.main} /></ListItemIcon>
                        <ListItemText 
                            primary={
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                    Khảo sát thiết kế
                                </Typography>
                            } 
                        />
                    </MenuItem>
                </PermissionGuard>

                <PermissionGuard permission="inundation:mechanic">
                    <MenuItem onClick={handleMenuClick('mech')}>
                        <ListItemIcon><IconTruck size={18} color={theme.palette.info.main} /></ListItemIcon>
                        <ListItemText 
                            primary={
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'info.main' }}>
                                    Cơ giới
                                </Typography>
                            } 
                        />
                    </MenuItem>
                </PermissionGuard>

                <Divider />

                <PermissionGuard permission="inundation:review">
                    <MenuItem 
                        onClick={handleMenuClick('quick_finish')} 
                        disabled={!hasActiveReport}
                        sx={{ 
                            color: 'success.main',
                            '&:hover': { bgcolor: 'success.lighter' }
                        }}
                    >
                        <ListItemIcon><IconCircleCheck size={18} color={theme.palette.success.main} /></ListItemIcon>
                        <ListItemText 
                            primary={
                                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'success.main' }}>
                                    Kết thúc nhanh
                                </Typography>
                            } 
                        />
                    </MenuItem>
                </PermissionGuard>

                <MenuItem onClick={() => { handleClose(); onViewHistory(point); }}>
                    <ListItemIcon><IconHistory size={18} color={theme.palette.grey[600]} /></ListItemIcon>
                    <ListItemText 
                        primary={
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                Lịch sử điểm ngập
                            </Typography>
                        } 
                    />
                </MenuItem>
            </Menu>
        </>
    );
};

export default AdminInundationActionMenu;
