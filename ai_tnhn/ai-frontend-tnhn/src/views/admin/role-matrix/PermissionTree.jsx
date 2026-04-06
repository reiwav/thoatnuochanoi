import React, { useMemo } from 'react';
import {
    Box,
    Checkbox,
    Chip,
    FormControlLabel,
    Typography,
    Stack,
    Divider,
    Paper,
    Grid
} from '@mui/material';
import { IconSquare, IconCheckbox, IconMinus } from '@tabler/icons-react';

const ModuleItem = ({ label, actions, selectedPermissions, onToggle, disabled }) => {
    const isAllSelected = actions.every(a => selectedPermissions.includes(a.code));
    const isSomeSelected = actions.some(a => selectedPermissions.includes(a.code)) && !isAllSelected;

    const handleToggleModule = () => {
        const codes = actions.map(a => a.code);
        onToggle(codes, !isAllSelected);
    };

    const handleToggleAction = (code, checked) => {
        onToggle(code, checked);
    };

    return (
        <Paper 
            variant="outlined" 
            sx={{ 
                p: 1.5, 
                mb: 1.5, 
                borderRadius: 2, 
                border: '1px solid', 
                borderColor: 'divider',
                bgcolor: isAllSelected ? 'primary.light' + '05' : 'background.paper',
                '&:hover': { bgcolor: 'grey.50' },
                '&:last-child': { mb: 0 }
            }}
        >
            <FormControlLabel
                control={
                    <Checkbox
                        size="small"
                        checked={isAllSelected}
                        indeterminate={isSomeSelected}
                        onChange={handleToggleModule}
                        disabled={disabled}
                        icon={<IconSquare size={18} />}
                        checkedIcon={<IconCheckbox size={18} />}
                        indeterminateIcon={<IconMinus size={18} />}
                    />
                }
                label={<Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.dark' }}>{label}</Typography>}
            />
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ pl: 3.5, mt: 0.5 }}>
                {actions.map(action => (
                    <FormControlLabel
                        key={action.code}
                        control={
                            <Checkbox
                                size="small"
                                checked={selectedPermissions.includes(action.code)}
                                onChange={(e) => handleToggleAction(action.code, e.target.checked)}
                                disabled={disabled}
                            />
                        }
                        label={<Typography variant="body2">{action.label}</Typography>}
                        sx={{ 
                            m: 0, 
                            mr: 1,
                            '& .MuiTypography-root': { fontSize: '0.8rem' }
                        }}
                    />
                ))}
            </Stack>
        </Paper>
    );
};

const PermissionTree = ({ permissions, selectedPermissions = [], onToggle, disabled }) => {
    const groupedData = useMemo(() => {
        const groups = {};

        permissions.forEach(perm => {
            const groupName = perm.group || 'CHUNG';
            if (!groups[groupName]) {
                groups[groupName] = {};
            }

            const parts = perm.code.split(':');
            const moduleName = parts.length > 1 ? parts[0] : 'core';
            
            if (!groups[groupName][moduleName]) {
                groups[groupName][moduleName] = { 
                    label: moduleName.toUpperCase(), 
                    actions: [] 
                };
            }

            groups[groupName][moduleName].actions.push({
                code: perm.code,
                label: perm.title // Giữ nguyên tiêu đề đầy đủ (Xem, Thêm, Sửa...) để tránh nhầm lẫn
            });
        });

        // Sắp xếp các Group để đảm bảo thứ tự hiển thị ổn định
        const sortedGroups = {};
        Object.keys(groups).sort().forEach(key => {
            sortedGroups[key] = groups[key];
        });

        return sortedGroups;
    }, [permissions]);

    return (
        <Box sx={{ p: 1 }}>
            {Object.entries(groupedData).map(([groupName, modules]) => (
                <Paper 
                    key={`group-${groupName}`} 
                    variant="outlined"
                    sx={{ 
                        borderRadius: 3, 
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        mb: 2.5,
                        '&:last-child': { mb: 0 }
                    }}
                >
                    {/* Group Header */}
                    <Box sx={{ 
                        px: 2.5, 
                        py: 1.5, 
                        bgcolor: 'grey.100', 
                        borderBottom: '2px solid',
                        borderColor: 'secondary.light',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}>
                        <Typography 
                            variant="overline" 
                            sx={{ 
                                fontWeight: 900, 
                                color: 'secondary.main', 
                                letterSpacing: 2,
                                fontSize: '0.8rem',
                                lineHeight: 1.5
                            }}
                        >
                            {groupName}
                        </Typography>
                        <Chip 
                            label={Object.keys(modules).length} 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                        />
                    </Box>
                    {/* Module List */}
                    <Box sx={{ p: 1.5 }}>
                        {Object.entries(modules).map(([moduleKey, moduleData]) => (
                            <ModuleItem 
                                key={`module-${moduleKey}`}
                                label={moduleData.label}
                                actions={moduleData.actions}
                                selectedPermissions={selectedPermissions}
                                onToggle={onToggle}
                                disabled={disabled}
                            />
                        ))}
                    </Box>
                </Paper>
            ))}
        </Box>
    );
};

export default PermissionTree;
;
