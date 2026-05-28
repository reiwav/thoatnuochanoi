import React from 'react';
import {
    Box,
    CircularProgress,
    Button,
    Stack,
    TextField,
    InputAdornment,
    useTheme,
    Chip,
    IconButton,
    Typography
} from '@mui/material';
import { IconSearch, IconDeviceFloppy, IconX } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import useRoleMatrix from './hooks/useRoleMatrix';
import RoleListSelector from './components/RoleListSelector';
import PermissionTree from './components/PermissionTree';

const RoleMatrix = () => {
    const theme = useTheme();
    const {
        hasPermission,
        loading,
        roles,
        saving,
        selectedRole,
        setSelectedRole,
        searchTerm,
        setSearchTerm,
        roleMatrix,
        handleToggle,
        handleSave,
        filteredPermissions,
        currentRoleData
    } = useRoleMatrix();

    if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="70vh"><CircularProgress size={40} color="secondary" /></Box>;

    return (
        <MainCard content={false}>
            <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
                {/* Left Column: Role List */}
                <RoleListSelector
                    roles={roles}
                    selectedRole={selectedRole}
                    setSelectedRole={setSelectedRole}
                />

                {/* Right Column: Permission Configuration */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Header Section */}
                    <Box sx={{ p: 3, bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography sx={{ fontSize: '1.25rem', fontWeight: 900 }}>
                                    {currentRoleData?.name || '---'}
                                </Typography>
                                <Chip label={selectedRole} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                            </Stack>
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                Cấu hình quyền hạn truy cập chức năng cho vai trò này
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <IconDeviceFloppy size={20} />}
                            onClick={handleSave}
                            disabled={saving || !hasPermission('role:edit')}
                            sx={{ borderRadius: '10px', px: 4, py: 1.2, fontWeight: 800 }}
                        >
                            {saving ? 'Đang lưu...' : 'Lưu Thay đổi'}
                        </Button>
                    </Box>

                    {/* Toolbar Section */}
                    <Box sx={{ px: 3, py: 2, bgcolor: '#fdfdfd', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                        <TextField
                            size="small"
                            placeholder="Tìm kiếm quyền hạn..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: <IconSearch size={18} style={{ marginRight: 8, color: '#919eab' }} />,
                                    endAdornment: searchTerm && (
                                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                                            <IconX size={16} />
                                        </IconButton>
                                    ),
                                    sx: { borderRadius: '10px' }
                                }
                            }}
                            sx={{ width: 300 }}
                        />
                    </Box>

                    {/* Content Section - Scrollable */}
                    <Box sx={{ p: 3, flex: 1, overflowY: 'auto', bgcolor: '#fff' }}>
                        <PermissionTree
                            permissions={filteredPermissions}
                            selectedPermissions={roleMatrix[selectedRole] || []}
                            onToggle={handleToggle}
                            disabled={!hasPermission('role:edit')}
                        />
                    </Box>
                </Box>
            </Box>
        </MainCard>
    );
};

export default RoleMatrix;
