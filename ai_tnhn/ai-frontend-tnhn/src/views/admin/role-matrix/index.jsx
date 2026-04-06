import React, { useEffect, useState, useMemo } from 'react';

// material-ui
import {
    List,
    ListItemButton,
    ListItemText,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Button,
    Stack,
    TextField,
    InputAdornment,
    useTheme,
    Divider,
    Chip,
    Paper
} from '@mui/material';
import { IconShieldLock, IconSearch, IconDeviceFloppy, IconChevronRight, IconInfoCircle } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import axiosClient from 'api/axiosClient';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';
import PermissionTree from './PermissionTree';

const RoleMatrix = () => {
    const theme = useTheme();
    const { role: userRole, hasPermission, fetchPermissions } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [roles, setRoles] = useState([]);
    const [permissionsList, setPermissionsList] = useState([]);
    const [roleMatrix, setRoleMatrix] = useState({}); // { roleCode: [permCode1, permCode2] }
    const [saving, setSaving] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [matrixRes, rolesRes] = await Promise.all([
                axiosClient.get('/admin/permissions/matrix'),
                axiosClient.get('/admin/roles')
            ]);

            const { roles: rolePerms, permissions: perms } = matrixRes.data.data;
            const rolesList = rolesRes.data.data || [];

            setPermissionsList(perms || []);
            setRoles(rolesList);

            if (rolesList.length > 0) {
                setSelectedRole(rolesList[0].code);
            }

            const matrix = {};
            rolePerms.forEach(rp => {
                matrix[rp.role] = rp.permissions || [];
            });
            setRoleMatrix(matrix);
        } catch (error) {
            console.error('Error fetching matrix:', error);
            toast.error('Không thể tải dữ liệu phân quyền');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggle = (codes, checked) => {
        if (!hasPermission('role:edit')) return;
        if (!selectedRole) return;

        const currentPerms = new Set(roleMatrix[selectedRole] || []);

        if (Array.isArray(codes)) {
            codes.forEach(code => {
                if (checked) currentPerms.add(code);
                else currentPerms.delete(code);
            });
        } else {
            if (checked) currentPerms.add(codes);
            else currentPerms.delete(codes);
        }

        setRoleMatrix({ ...roleMatrix, [selectedRole]: Array.from(currentPerms) });
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            await axiosClient.post('/admin/permissions/matrix', {
                role: selectedRole,
                permissions: roleMatrix[selectedRole] || []
            });
            toast.success(`Đã cập nhật quyền thành công`);

            if (userRole === selectedRole) {
                await fetchPermissions();
            }
        } catch (error) {
            console.error('Error saving matrix:', error);
            toast.error('Lỗi khi lưu phân quyền');
        } finally {
            setSaving(false);
        }
    };

    const filteredPermissions = useMemo(() => {
        if (!searchTerm) return permissionsList;
        const lowerSearch = searchTerm.toLowerCase();
        return permissionsList.filter(p =>
            p.title.toLowerCase().includes(lowerSearch) ||
            p.code.toLowerCase().includes(lowerSearch) ||
            (p.group && p.group.toLowerCase().includes(lowerSearch))
        );
    }, [permissionsList, searchTerm]);

    if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="70vh"><CircularProgress size={40} color="secondary" /></Box>;

    const currentRoleData = roles.find(r => r.code === selectedRole);

    return (
        <MainCard content={false}>
            <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
                {/* Left Column: Role List */}
                <Box sx={{
                    width: 320,
                    minWidth: 320,
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'grey.50',
                    display: 'flex',
                    flexDirection: 'column'
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

                {/* Right Column: Permission Configuration */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Header Section */}
                    <Box sx={{ p: 3, bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="h3" sx={{ fontWeight: 900 }}>
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
