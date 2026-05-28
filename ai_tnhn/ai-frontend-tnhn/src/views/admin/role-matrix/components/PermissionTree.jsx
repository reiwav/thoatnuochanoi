import React, { useMemo } from 'react';
import {
    Box,
    Checkbox,
    Chip,
    FormControlLabel,
    Typography,
    Stack,
    Paper,
    Tooltip
} from '@mui/material';
import { IconSquare, IconCheckbox, IconMinus } from '@tabler/icons-react';

// Thứ tự groups theo menu sidebar (không sort A-Z)
const GROUP_ORDER = [
    'Hệ thống báo cáo',
    'Lượng mưa',
    'Điểm ngập',
    'Mực nước',
    'BC CT Khẩn cấp',
    'Cửa phai',
    'Trạm bơm',
    'Sa hình ngập',
    'Hệ thống',
    'Hợp đồng',
];

// Label hiển thị cho sub-module trong groups phức tạp (nhiều prefix code khác nhau)
const MODULE_LABELS = {
    employee: 'Tài khoản',
    organization: 'Đơn vị',
    role: 'Chức vụ',
    'role-matrix': 'Phân quyền',
    contract: 'Danh sách HĐ',
    'contract-category': 'Danh mục',
    'contract-ai': 'AI Trợ lý',
};

const PermissionTree = ({ permissions, selectedPermissions = [], onToggle, disabled }) => {
    const groupedData = useMemo(() => {
        const groups = {};

        permissions.forEach(perm => {
            const groupName = perm.group || 'Khác';
            if (!groups[groupName]) {
                groups[groupName] = {};
            }

            const parts = perm.code.split(':');
            const moduleName = parts.length > 1 ? parts[0] : 'core';

            if (!groups[groupName][moduleName]) {
                groups[groupName][moduleName] = {
                    label: MODULE_LABELS[moduleName] || moduleName.toUpperCase(),
                    actions: []
                };
            }

            groups[groupName][moduleName].actions.push({
                code: perm.code,
                label: perm.title,
                type: perm.type,
                description: perm.description
            });
        });

        // Sắp xếp theo thứ tự menu sidebar
        const sorted = [];
        GROUP_ORDER.forEach(name => {
            if (groups[name]) {
                sorted.push({ name, modules: groups[name] });
            }
        });
        // Thêm groups không nằm trong ORDER vào cuối
        Object.keys(groups).forEach(name => {
            if (!GROUP_ORDER.includes(name)) {
                sorted.push({ name, modules: groups[name] });
            }
        });

        return sorted;
    }, [permissions]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {groupedData.map(({ name: groupName, modules }) => {
                const moduleEntries = Object.entries(modules);
                const hasMultipleModules = moduleEntries.length > 1;
                const allCodes = moduleEntries.flatMap(([, m]) => m.actions.map(a => a.code));
                const allSelected = allCodes.length > 0 && allCodes.every(c => selectedPermissions.includes(c));
                const someSelected = allCodes.some(c => selectedPermissions.includes(c)) && !allSelected;

                const handleToggleAll = () => {
                    onToggle(allCodes, !allSelected);
                };

                return (
                    <Paper
                        key={groupName}
                        variant="outlined"
                        sx={{
                            borderRadius: 3,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: someSelected ? 'warning.light' : allSelected ? 'success.light' : 'divider',
                            transition: 'border-color 0.2s'
                        }}
                    >
                        {/* Group Header = Menu Name */}
                        <Box sx={{
                            px: 2.5,
                            py: 1.5,
                            bgcolor: allSelected ? 'success.lighter' : someSelected ? 'warning.lighter' : 'grey.50',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background-color 0.2s'
                        }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={allSelected}
                                        indeterminate={someSelected}
                                        onChange={handleToggleAll}
                                        disabled={disabled}
                                        icon={<IconSquare size={18} />}
                                        checkedIcon={<IconCheckbox size={18} />}
                                        indeterminateIcon={<IconMinus size={18} />}
                                        sx={{ color: 'secondary.main' }}
                                    />
                                }
                                label={
                                    <Typography variant="subtitle1" sx={{
                                        fontWeight: 800,
                                        color: allSelected ? 'success.dark' : 'text.primary',
                                        letterSpacing: 0.5,
                                    }}>
                                        {groupName}
                                    </Typography>
                                }
                                sx={{ m: 0 }}
                            />
                            <Chip
                                label={`${allCodes.filter(c => selectedPermissions.includes(c)).length}/${allCodes.length}`}
                                size="small"
                                color={allSelected ? 'success' : someSelected ? 'warning' : 'default'}
                                variant={allSelected || someSelected ? 'filled' : 'outlined'}
                                sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                            />
                        </Box>

                        {/* Content: Actions / Sub-modules */}
                        <Box sx={{ p: 2 }}>
                            {hasMultipleModules ? (
                                // Multi-module group (e.g. Hệ thống → Tài khoản, Chi nhánh, Quyền)
                                <Stack spacing={1.5}>
                                    {moduleEntries.map(([moduleKey, moduleData]) => {
                                        const modCodes = moduleData.actions.map(a => a.code);
                                        const modAllSelected = modCodes.every(c => selectedPermissions.includes(c));
                                        const modSomeSelected = modCodes.some(c => selectedPermissions.includes(c)) && !modAllSelected;

                                        return (
                                            <Box
                                                key={moduleKey}
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: modAllSelected ? 'success.lighter' : 'grey.50',
                                                    border: '1px solid',
                                                    borderColor: modAllSelected ? 'success.light' : 'divider',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={modAllSelected}
                                                            indeterminate={modSomeSelected}
                                                            onChange={() => onToggle(modCodes, !modAllSelected)}
                                                            disabled={disabled}
                                                            icon={<IconSquare size={16} />}
                                                            checkedIcon={<IconCheckbox size={16} />}
                                                            indeterminateIcon={<IconMinus size={16} />}
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                                            {moduleData.label}
                                                        </Typography>
                                                    }
                                                    sx={{ m: 0 }}
                                                />
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ pl: 3.5, mt: 0.5 }}>
                                                    {moduleData.actions.map(action => (
                                                        <FormControlLabel
                                                            key={action.code}
                                                            control={
                                                                <Checkbox
                                                                    size="small"
                                                                    checked={selectedPermissions.includes(action.code)}
                                                                    onChange={(e) => onToggle(action.code, e.target.checked)}
                                                                    disabled={disabled}
                                                                />
                                                            }
                                                            label={
                                                                <Tooltip title={action.description ? `[${(action.type || 'HÀNH ĐỘNG').toUpperCase()}] ${action.description}` : action.label} arrow placement="top">
                                                                    <Typography variant="body2">{action.label}</Typography>
                                                                </Tooltip>
                                                            }
                                                            sx={{
                                                                m: 0,
                                                                mr: 1.5,
                                                                '& .MuiTypography-root': { fontSize: '0.82rem' }
                                                            }}
                                                        />
                                                    ))}
                                                </Stack>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            ) : (
                                // Single-module group (e.g. Lượng mưa, Cửa phai) → flat actions
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ pl: 1 }}>
                                    {moduleEntries[0][1].actions.map(action => (
                                        <FormControlLabel
                                            key={action.code}
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={selectedPermissions.includes(action.code)}
                                                    onChange={(e) => onToggle(action.code, e.target.checked)}
                                                    disabled={disabled}
                                                />
                                            }
                                            label={
                                                <Tooltip title={action.description ? `[${(action.type || 'HÀNH ĐỘNG').toUpperCase()}] ${action.description}` : action.label} arrow placement="top">
                                                    <Typography variant="body2">{action.label}</Typography>
                                                </Tooltip>
                                            }
                                            sx={{
                                                m: 0,
                                                mr: 2,
                                                '& .MuiTypography-root': { fontSize: '0.85rem' }
                                            }}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </Paper>
                );
            })}
        </Box>
    );
};

export default PermissionTree;
