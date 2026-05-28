import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import useAuthStore from 'store/useAuthStore';
import useRoleStore from 'store/useRoleStore';
import * as ROLES from 'constants/role';

const useRoleList = () => {
    const { hasPermission } = useAuthStore();
    
    const {
        roles, loading,
        fetchRoles, createRole, updateRole, deleteRole
    } = useRoleStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const handleOpenCreate = () => {
        setEditingRole(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (role) => {
        setEditingRole(role);
        setDialogOpen(true);
    };

    const handleDelete = async (id, code) => {
        if (code === ROLES.ROLE_SUPER_ADMIN) {
            toast.error('Không thể xóa vai trò Super Admin hệ thống');
            return;
        }
        if (!window.confirm('Bạn có chắc chắn muốn xóa vai trò này?')) return;
        try {
            await deleteRole(id);
            toast.success('Xóa thành công');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa vai trò');
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingRole) {
                await updateRole(editingRole.id, values);
            } else {
                await createRole(values);
            }
            toast.success(editingRole ? 'Cập nhật thành công' : 'Thêm mới thành công');
            setDialogOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    const filteredRoles = roles.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
        hasPermission,
        loading,
        searchQuery,
        setSearchQuery,
        dialogOpen,
        setDialogOpen,
        editingRole,
        filteredRoles,
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleSubmit
    };
};

export default useRoleList;
