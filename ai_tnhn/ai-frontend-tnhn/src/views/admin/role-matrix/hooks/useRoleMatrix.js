import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';

import axiosClient from 'api/axiosClient';
import useAuthStore from 'store/useAuthStore';

const useRoleMatrix = () => {
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

            // Interceptor đã bóc tách dữ liệu
            const { roles: rolePerms, permissions: perms } = matrixRes;
            const rolesList = rolesRes || [];

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

    const currentRoleData = roles.find(r => r.code === selectedRole);

    return {
        userRole,
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
    };
};

export default useRoleMatrix;
