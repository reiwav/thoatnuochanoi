import React from 'react';
import {
    Box, Typography, Divider, List, ListItemButton, ListItemText, useTheme
} from '@mui/material';
import { IconShieldLock, IconChevronRight } from '@tabler/icons-react';

const RoleListSelector = ({ roles, selectedRole, setSelectedRole }) => {
    const theme = useTheme();

    return (
        <Box sx={{
            width: { xs: '100%', md: 320 },
            minWidth: { xs: '100%', md: 320 },
            borderRight: { xs: 'none', md: '1px solid' },
            borderColor: 'divider',
            bgcolor: 'grey.50',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        }}>
            <Box sx={{ p: 3, flexShrink: 0 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconShieldLock size={22} color={theme.palette.secondary.main} /> Vai trò
                </Typography>
                <Typography variant="caption" color="textSecondary">
                    Chọn vai trò để quản lý quyền hạn chi tiết
                </Typography>
            </Box>
            <Divider />
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                <List sx={{ p: 0 }}>
                    {roles.map((role) => (
                        <ListItemButton
                            key={role.code}
                            selected={selectedRole === role.code}
                            onClick={() => setSelectedRole(role.code)}
                            sx={{
                                py: 2,
                                px: 3,
                                borderLeft: selectedRole === role.code ? `4px solid ${theme.palette.secondary.main}` : '4px solid transparent',
                                bgcolor: selectedRole === role.code ? '#fff' : 'transparent',
                                '&.Mui-selected': {
                                    bgcolor: '#fff',
                                    '&:hover': { bgcolor: '#fff' }
                                }
                            }}
                        >
                            <ListItemText
                                primary={role.name}
                                secondary={role.code}
                                primaryTypographyProps={{
                                    fontWeight: selectedRole === role.code ? 800 : 500,
                                    color: selectedRole === role.code ? theme.palette.secondary.main : 'inherit'
                                }}
                                secondaryTypographyProps={{ fontSize: '0.75rem' }}
                            />
                            {selectedRole === role.code && <IconChevronRight size={18} color={theme.palette.secondary.main} />}
                        </ListItemButton>
                    ))}
                </List>
            </Box>
        </Box>
    );
};

export default RoleListSelector;
