import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import useAuthStore from 'store/useAuthStore';
import useOrganizationStore from 'store/useOrganizationStore';

const useOrganizationList = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuthStore();
    
    const {
        organizations, loading, totalItems, page, rowsPerPage, filters,
        fetchOrganizations, setPage, setRowsPerPage, setFilters,
        createOrganization, updateOrganization, deleteOrganization
    } = useOrganizationStore();

    const [filterInputs, setFilterInputs] = useState(filters);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState(null);

    useEffect(() => {
        fetchOrganizations();
    }, [page, rowsPerPage, fetchOrganizations]);

    const handleSearch = () => {
        setFilters(filterInputs);
        fetchOrganizations();
    };

    const handleOpenCreate = () => { setEditingOrg(null); setDialogOpen(true); };
    const handleOpenEdit = (org) => { setEditingOrg(org); setDialogOpen(true); };
    const handleManageUsers = (org) => {
        navigate(`/admin/employee?org_id=${org.id}&org_name=${encodeURIComponent(org.name)}`);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa công ty này?')) return;
        try {
            await deleteOrganization(id);
            toast.success('Xóa thành công');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa công ty');
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingOrg) {
                await updateOrganization(editingOrg.id, values);
            } else {
                await createOrganization(values);
            }
            toast.success(editingOrg ? 'Cập nhật thành công' : 'Thêm mới thành công');
            setDialogOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    return {
        hasPermission,
        organizations,
        loading,
        totalItems,
        page,
        rowsPerPage,
        setPage,
        setRowsPerPage,
        filterInputs,
        setFilterInputs,
        dialogOpen,
        setDialogOpen,
        editingOrg,
        handleSearch,
        handleOpenCreate,
        handleOpenEdit,
        handleManageUsers,
        handleDelete,
        handleSubmit
    };
};

export default useOrganizationList;
