import React, { useState } from 'react';
import { Box, Typography, Avatar, IconButton, Tooltip, Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { 
    IconRobot, 
    IconRefresh, 
    IconBolt, 
    IconDatabase, 
    IconLayoutSidebarRightExpand, 
    IconLayoutSidebarRightCollapse,
    IconDotsVertical,
    IconFileDescription
} from '@tabler/icons-react';

const ChatHeader = ({ 
    isMobile, 
    showStats, 
    setShowStats, 
    hasPermission, 
    handleQuickReportText, 
    handleAIDynamicReport, 
    handleQuickReport, 
    openReportDialog 
}) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const openMenu = Boolean(anchorEl);
    
    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    return (
        <Box sx={{ 
            p: { xs: 1, md: 1.5 }, 
            borderBottom: '1px solid', 
            borderColor: 'divider', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            bgcolor: 'white',
            zIndex: 10
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ 
                    bgcolor: '#f0f2f5', 
                    color: '#0084FF',
                    width: { xs: 32, md: 40 }, 
                    height: { xs: 32, md: 40 },
                }}>
                    <IconRobot size={20} />
                </Avatar>
                <Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2, color: 'text.primary' }}>Hệ thống báo cáo AI</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>Vietnam / Thoát nước Hà Nội</Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {!isMobile && (
                    <>
                        {hasPermission('ai:report') && (
                            <Tooltip title="Tin nhắn báo cáo">
                                <IconButton color="success" onClick={handleQuickReportText} sx={{ bgcolor: 'rgba(46, 125, 50, 0.05)' }}>
                                    <IconRefresh size={20} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {hasPermission('ai:synthesis') && (
                            <Tooltip title="Báo cáo tổng hợp">
                                <IconButton color="secondary" onClick={handleAIDynamicReport} sx={{ bgcolor: 'rgba(123, 31, 162, 0.05)' }}>
                                    <IconRobot size={20} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {hasPermission('ai:post-rain') && (
                            <Tooltip title="Xuất báo cáo Words">
                                <IconButton onClick={handleQuickReport} color="primary" sx={{ bgcolor: 'rgba(25, 118, 210, 0.05)' }}>
                                    <IconBolt size={20} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </>
                )}

                {isMobile ? (
                    <IconButton onClick={handleMenuOpen} sx={{ color: '#0084FF' }}>
                        <IconDotsVertical size={22} />
                    </IconButton>
                ) : (
                    <IconButton onClick={handleMenuOpen} sx={{ color: 'text.secondary' }}>
                        <IconDotsVertical size={22} />
                    </IconButton>
                )}

                <Menu
                    anchorEl={anchorEl}
                    open={openMenu}
                    onClose={handleMenuClose}
                    PaperProps={{ sx: { borderRadius: '12px', minWidth: 200, mt: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}
                >
                    {isMobile && (
                        <>
                            {hasPermission('ai:report') && (
                                <MenuItem onClick={() => { handleQuickReportText(); handleMenuClose(); }}>
                                    <ListItemIcon><IconRefresh size={20} color="#2e7d32" /></ListItemIcon>
                                    <ListItemText primary="Tin nhắn báo cáo" primaryTypographyProps={{ fontWeight: 600 }} />
                                </MenuItem>
                            )}
                            {hasPermission('ai:synthesis') && (
                                <MenuItem onClick={() => { handleAIDynamicReport(); handleMenuClose(); }}>
                                    <ListItemIcon><IconRobot size={20} color="#7b1fa2" /></ListItemIcon>
                                    <ListItemText primary="Báo cáo tổng hợp" primaryTypographyProps={{ fontWeight: 600 }} />
                                </MenuItem>
                            )}
                        </>
                    )}
                    {hasPermission('ai:post-rain') && (
                        <MenuItem onClick={() => { handleQuickReport(); handleMenuClose(); }}>
                            <ListItemIcon><IconBolt size={20} color="#1976d2" /></ListItemIcon>
                            <ListItemText primary="Báo cáo sau mưa (Word)" primaryTypographyProps={{ fontWeight: 600 }} />
                        </MenuItem>
                    )}
                    {hasPermission('ai:report-emergency') && (
                        <MenuItem onClick={() => { openReportDialog(); handleMenuClose(); }}>
                            <ListItemIcon><IconFileDescription size={20} color="#ef6c00" /></ListItemIcon>
                            <ListItemText primary="Xuất BC công trình" primaryTypographyProps={{ fontWeight: 600 }} />
                        </MenuItem>
                    )}
                    <Divider />
                    <MenuItem onClick={() => { setShowStats(!showStats); handleMenuClose(); }}>
                        <ListItemIcon>
                            {showStats ? <IconLayoutSidebarRightCollapse size={20} /> : <IconLayoutSidebarRightExpand size={20} />}
                        </ListItemIcon>
                        <ListItemText primary={showStats ? "Ẩn thống kê hệ thống" : "Hiện thống kê hệ thống"} primaryTypographyProps={{ fontWeight: 600 }} />
                    </MenuItem>
                </Menu>

                {!isMobile && (
                    <Tooltip title="Thống kê hệ thống">
                        <IconButton
                            onClick={() => setShowStats(!showStats)}
                            sx={{ color: showStats ? '#0084FF' : 'text.secondary', bgcolor: showStats ? 'rgba(0, 132, 255, 0.05)' : 'transparent' }}
                        >
                            {showStats ? <IconLayoutSidebarRightCollapse size={22} /> : <IconLayoutSidebarRightExpand size={22} />}
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        </Box>
    );
};

export default ChatHeader;
