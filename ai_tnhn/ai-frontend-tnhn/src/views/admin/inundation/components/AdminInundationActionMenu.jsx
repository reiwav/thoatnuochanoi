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
                            minWidth: 220,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                            '& .MuiMenuItem-root': {
                                py: 1.5,
                                px: 2,
                                borderRadius: 1.5,
                                mx: 1,
                                mb: 0.5,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.08)
                                }
                            }
                        }
                    }
                }}
            >
                <PermissionGuard permission="inundation:review">
                    <MenuItem onClick={handleMenuClick('comment')}>
                        <ListItemIcon><IconMessageDots size={22} color={theme.palette.error.main} /></ListItemIcon>
                        <ListItemText
                            primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'error.main' }}>
                                    Nhận xét của P. KT-CL
                                </Typography>
                            }
                        />
                    </MenuItem>
                </PermissionGuard>

                <PermissionGuard permission="inundation:report">
                    <MenuItem onClick={handleMenuClick('report')}>
                        <ListItemIcon><IconReportMedical size={22} color={theme.palette.secondary.main} /></ListItemIcon>
                        <ListItemText
                            primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                                    Cập nhật diễn biến
                                </Typography>
                            }
                        />
                    </MenuItem>
                </PermissionGuard>

                <PermissionGuard permission="inundation:survey">
                    <MenuItem onClick={handleMenuClick('survey')}>
                        <ListItemIcon><IconRulerMeasure size={22} color={theme.palette.primary.main} /></ListItemIcon>
                        <ListItemText
                            primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                    XN KSTK
                                </Typography>
                            }
                        />
                    </MenuItem>
                </PermissionGuard>

                <PermissionGuard permission="inundation:mechanic">
                    <MenuItem onClick={handleMenuClick('mech')}>
                        <ListItemIcon><IconTruck size={22} color={theme.palette.info.main} /></ListItemIcon>
                        <ListItemText
                            primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'info.main' }}>
                                    XN Cơ giới
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
                            '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.1) + ' !important' }
                        }}
                    >
                        <ListItemIcon><IconCircleCheck size={22} color={theme.palette.success.main} /></ListItemIcon>
                        <ListItemText
                            primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'success.main' }}>
                                    Kết thúc nhanh
                                </Typography>
                            }
                        />
                    </MenuItem>
                </PermissionGuard>

                <MenuItem onClick={() => { handleClose(); onViewHistory(point); }}>
                    <ListItemIcon><IconHistory size={22} color={theme.palette.grey[600]} /></ListItemIcon>
                    <ListItemText
                        primary={
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
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
