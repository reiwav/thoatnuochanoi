import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider, useTheme } from '@mui/material';
import { 
    IconDotsVertical, 
    IconMessageDots, 
    IconReportMedical, 
    IconRulerMeasure, 
    IconTruck, 
    IconCircleCheck 
} from '@tabler/icons-react';

const AdminInundationActionMenu = ({ 
    point, 
    onAction 
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
            >
                <IconDotsVertical size={20} />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem onClick={handleMenuClick('comment')} disabled={!hasActiveReport}>
                    <ListItemIcon><IconMessageDots size={18} color={theme.palette.text.primary} /></ListItemIcon>
                    <ListItemText 
                        primary="Nhận xét rà soát" 
                        primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 600, color: 'text.primary' }} 
                    />
                </MenuItem>
                
                <MenuItem onClick={handleMenuClick('report')} disabled={!hasActiveReport}>
                    <ListItemIcon><IconReportMedical size={18} color={theme.palette.text.primary} /></ListItemIcon>
                    <ListItemText 
                        primary="Cập nhật diễn biến" 
                        primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 600, color: 'text.primary' }} 
                    />
                </MenuItem>

                <MenuItem onClick={handleMenuClick('survey')} disabled={!hasActiveReport}>
                    <ListItemIcon><IconRulerMeasure size={18} color={theme.palette.text.primary} /></ListItemIcon>
                    <ListItemText 
                        primary="Khảo sát thiết kế" 
                        primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 600, color: 'text.primary' }} 
                    />
                </MenuItem>

                <MenuItem onClick={handleMenuClick('mech')} disabled={!hasActiveReport}>
                    <ListItemIcon><IconTruck size={18} color={theme.palette.text.primary} /></ListItemIcon>
                    <ListItemText 
                        primary="Cơ giới" 
                        primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 600, color: 'text.primary' }} 
                    />
                </MenuItem>

                <Divider />

                <MenuItem 
                    onClick={handleMenuClick('quick_finish')} 
                    disabled={!hasActiveReport}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon><IconCircleCheck size={18} color="inherit" /></ListItemIcon>
                    <ListItemText 
                        primary="Kết thúc nhanh" 
                        primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 800, color: 'inherit' }} 
                    />
                </MenuItem>
            </Menu>
        </>
    );
};

export default AdminInundationActionMenu;
