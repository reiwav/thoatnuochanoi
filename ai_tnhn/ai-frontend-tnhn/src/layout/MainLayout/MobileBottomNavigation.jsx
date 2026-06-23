import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, BottomNavigation, BottomNavigationAction, Menu, MenuItem } from '@mui/material';

const MobileBottomNavigation = ({ employeeNavItems = [], otherItems = [] }) => {
    const navigate = useNavigate();
    const [otherMenuAnchor, setOtherMenuAnchor] = useState(null);

    return (
        <Paper
            sx={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
                borderRadius: '24px 24px 0 0', overflow: 'hidden',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid',
                borderColor: 'divider'
            }}
            elevation={0}
        >
            <BottomNavigation
                showLabels
                value={employeeNavItems.findIndex(item => item.active)}
                sx={{
                    height: 80,
                    bgcolor: 'transparent',
                    '& .MuiBottomNavigationAction-root': {
                        minWidth: 'auto',
                        color: 'text.secondary',
                        '&.Mui-selected': { color: 'primary.main' }
                    },
                    '& .MuiBottomNavigationAction-label': {
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        mt: 0.5,
                        '&.Mui-selected': { fontSize: '0.8rem' }
                    }
                }}
            >
                {employeeNavItems.map((item) => (
                    <BottomNavigationAction
                        key={item.id}
                        label={item.label}
                        icon={item.icon}
                        onClick={(event) => {
                            if (item.id === 'other') {
                                setOtherMenuAnchor(event.currentTarget);
                            } else {
                                navigate(item.path);
                            }
                        }}
                    />
                ))}
            </BottomNavigation>
            <Menu
                anchorEl={otherMenuAnchor}
                open={Boolean(otherMenuAnchor)}
                onClose={() => setOtherMenuAnchor(null)}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: '12px',
                            boxShadow: '0 -4px 20px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.15)',
                            border: '1px solid',
                            borderColor: 'divider',
                            mb: 1.5,
                            minWidth: 150
                        }
                    }
                }}
            >
                {otherItems.map((item) => (
                    <MenuItem
                        key={item.id}
                        onClick={() => {
                            setOtherMenuAnchor(null);
                            navigate(item.path);
                        }}
                        selected={item.active}
                        sx={{ fontWeight: 600, py: 1.5 }}
                    >
                        {item.label}
                    </MenuItem>
                ))}
            </Menu>
        </Paper>
    );
};

export default MobileBottomNavigation;
