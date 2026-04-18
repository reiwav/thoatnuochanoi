import React, { useState } from 'react';
import { Box, Typography, Avatar, IconButton, Tooltip, Button, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Stack } from '@mui/material';
import {
    IconRobot,
    IconRefresh,
    IconBolt,
    IconLayoutSidebarRightExpand,
    IconLayoutSidebarRightCollapse,
    IconDotsVertical,
    IconFileDescription,
    IconChartBar
} from '@tabler/icons-react';
import PermissionGuard from 'ui-component/PermissionGuard';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

const ChatHeader = ({
    showStats,
    setShowStats,
    hasPermission,
    handleQuickReportText,
    handleAIDynamicReport,
    handleQuickReport,
    openReportDialog
}) => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Avatar sx={{
                    bgcolor: '#f0f2f5',
                    color: '#0084FF',
                    width: { xs: 32, md: 40 },
                    height: { xs: 32, md: 40 },
                }}>
                    <IconRobot size={20} />
                </Avatar>
                <Box sx={{ minWidth: 0, flexShrink: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ lineHeight: 1.2, color: 'text.primary' }}>Báo cáo AI</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>Vietnam / TNHN</Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Desktop Buttons */}
                {isDesktop && (
                    <Stack direction="row" spacing={1} sx={{ mr: 1 }}>
                        <PermissionGuard permission="ai:report">
                            <Button
                                variant="light"
                                sx={{
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    color: '#2e7d32',
                                    bgcolor: 'rgba(46, 125, 50, 0.08)',
                                    '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.15)' }
                                }}
                                size="small"
                                startIcon={<IconRefresh size={18} color="#2e7d32" />}
                                onClick={handleQuickReportText}
                            >
                                Tin nhắn BC
                            </Button>
                        </PermissionGuard>
                        <PermissionGuard permission="ai:synthesis">
                            <Button
                                variant="light"
                                sx={{
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    color: '#7b1fa2',
                                    bgcolor: 'rgba(123, 31, 162, 0.08)',
                                    '&:hover': { bgcolor: 'rgba(123, 31, 162, 0.15)' }
                                }}
                                size="small"
                                startIcon={<IconRobot size={18} color="#7b1fa2" />}
                                onClick={handleAIDynamicReport}
                            >
                                BC tổng hợp
                            </Button>
                        </PermissionGuard>
                        <PermissionGuard permission="ai:post-rain">
                            <Button
                                variant="light"
                                sx={{
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    color: '#0084FF',
                                    bgcolor: 'rgba(0, 132, 255, 0.08)',
                                    '&:hover': { bgcolor: 'rgba(0, 132, 255, 0.15)' }
                                }}
                                size="small"
                                startIcon={<IconBolt size={18} color="#0084FF" />}
                                onClick={handleQuickReport}
                            >
                                BC nhanh (Word)
                            </Button>
                        </PermissionGuard>
                    </Stack>
                )}

                {/* More Menu */}
                <IconButton onClick={handleMenuOpen} sx={{ color: '#0084FF', bgcolor: openMenu ? 'rgba(0, 132, 255, 0.05)' : 'transparent' }}>
                    <IconDotsVertical size={24} />
                </IconButton>

                <Menu
                    anchorEl={anchorEl}
                    open={openMenu}
                    onClose={handleMenuClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    PaperProps={{
                        sx: {
                            borderRadius: '16px',
                            minWidth: 220,
                            mt: 1,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            border: '1px solid',
                            borderColor: 'divider'
                        }
                    }}
                >
                    {/* Primary Report buttons (only for Mobile in menu) */}
                    {!isDesktop && (
                        <Box>
                            <PermissionGuard permission="ai:report">
                                <MenuItem onClick={() => { handleQuickReportText(); handleMenuClose(); }}>
                                    <ListItemIcon><IconRefresh size={20} color="#2e7d32" /></ListItemIcon>
                                    <ListItemText primary="Tin nhắn báo cáo" primaryTypographyProps={{ fontWeight: 600, color: '#2e7d32' }} />
                                </MenuItem>
                            </PermissionGuard>
                            <PermissionGuard permission="ai:synthesis">
                                <MenuItem onClick={() => { handleAIDynamicReport(); handleMenuClose(); }}>
                                    <ListItemIcon><IconRobot size={20} color="#7b1fa2" /></ListItemIcon>
                                    <ListItemText primary="Báo cáo tổng hợp" primaryTypographyProps={{ fontWeight: 600, color: '#7b1fa2' }} />
                                </MenuItem>
                            </PermissionGuard>
                            <PermissionGuard permission="ai:post-rain">
                                <MenuItem onClick={() => { handleQuickReport(); handleMenuClose(); }}>
                                    <ListItemIcon><IconBolt size={20} color="#0084FF" /></ListItemIcon>
                                    <ListItemText primary="Báo cáo nhanh (Word)" primaryTypographyProps={{ fontWeight: 600, color: '#0084FF' }} />
                                </MenuItem>
                            </PermissionGuard>
                        </Box>
                    )}

                    {/* Secondary Report - Export construction (always in menu for both) */}
                    <PermissionGuard permission="ai:report-emergency">
                        <MenuItem onClick={() => { openReportDialog(); handleMenuClose(); }}>
                            <ListItemIcon><IconFileDescription size={20} color="#ef6c00" /></ListItemIcon>
                            <ListItemText primary="Xuất BC công trình" primaryTypographyProps={{ fontWeight: 600, color: '#ef6c00' }} />
                        </MenuItem>
                    </PermissionGuard>

                    <Divider />

                    {/* Secondary items for both desktop and mobile */}
                    <MenuItem onClick={() => { setShowStats(!showStats); handleMenuClose(); }}>
                        <ListItemIcon>
                            <IconChartBar size={20} color="#0084FF" />
                        </ListItemIcon>
                        <ListItemText primary={showStats ? "Ẩn thống kê hệ thống" : "Hiện thống kê hệ thống"} primaryTypographyProps={{ fontWeight: 600 }} />
                    </MenuItem>
                </Menu>

                <Tooltip title="Thống kê">
                    <IconButton
                        onClick={() => setShowStats(!showStats)}
                        sx={{
                            color: showStats ? '#0084FF' : 'text.secondary',
                            bgcolor: showStats ? 'rgba(0, 132, 255, 0.05)' : 'transparent',
                            display: { xs: 'none', md: 'inline-flex' }
                        }}
                    >
                        {showStats ? <IconLayoutSidebarRightCollapse size={22} /> : <IconLayoutSidebarRightExpand size={22} />}
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

export default ChatHeader;
