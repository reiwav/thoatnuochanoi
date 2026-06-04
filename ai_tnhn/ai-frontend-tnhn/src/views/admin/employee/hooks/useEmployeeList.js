import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import useAuthStore from 'store/useAuthStore';
import useEmployeeStore from 'store/useEmployeeStore';
import useOrganizationStore from 'store/useOrganizationStore';
import axiosClient from 'api/axiosClient';

const useEmployeeList = () => {
    const { role: userRole, user: userInfo, hasPermission } = useAuthStore();
    const userOrgId = userInfo?.org_id || '';

    const {
        employees, loading, totalItems, page, rowsPerPage, filters,
        fetchEmployees, setPage, setRowsPerPage, setFilters,
        createEmployee, updateEmployee, deleteEmployee
    } = useEmployeeStore();

    const { fetchSelectionList } = useOrganizationStore();
    const [organizations, setOrganizations] = useState([]);
    const [roles, setRoles] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);

    const [searchParams] = useSearchParams();
    const urlOrgId = searchParams.get('org_id') || filters.org_id || userOrgId;
    const urlOrgName = searchParams.get('org_name') || '';

    // Khởi tạo bộ lọc thông minh: Tránh việc gọi API 2 lần (1 lần không có org_id, 1 lần có org_id do OrganizationSelect ép vào)
    const isCompanyLevel = userRole === 'super_admin' || userInfo?.is_company;
    const initialOrgId = (!isCompanyLevel && userInfo?.org_id) ? userInfo.org_id : (urlOrgId || '');

    const [filterInputs, setFilterInputs] = useState({ ...filters, org_id: initialOrgId });
    const isFirstRender = useRef(true);

    const loadMetadata = async () => {
        try {
            const [orgRes, roleRes] = await Promise.all([
                fetchSelectionList(),
                axiosClient.get('/admin/roles')
            ]);

            if (orgRes) {
                const list = Array.isArray(orgRes) ? orgRes : [...(orgRes.primary || []), ...(orgRes.shared || [])];
                // Deduplicate by ID
                const uniqueList = Array.from(new Map(list.map(item => [item.id, item])).values());
                setOrganizations(uniqueList);
            }
            if (roleRes) {
                setRoles(roleRes || []);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách cấu hình:', err);
        }
    };

    // Cơ chế Auto-search với debounce 500ms
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            // Nếu giá trị khởi tạo khác với filters hiện tại của store, ta cập nhật lại store
            if (JSON.stringify(filterInputs) !== JSON.stringify(filters)) {
                setFilters(filterInputs);
            }
            return;
        }

        const timer = setTimeout(() => {
            setFilters(filterInputs);
            setPage(0);
        }, 500);

        return () => clearTimeout(timer);
    }, [filterInputs, setFilters, setPage]);

    useEffect(() => {
        loadMetadata();
        fetchEmployees();
    }, [page, rowsPerPage, filters, fetchEmployees]);

    const handleOpenCreate = () => { setEditingEmployee(null); setDialogOpen(true); };
    const handleOpenEdit = (employee) => { setEditingEmployee(employee); setDialogOpen(true); };

    const handleDelete = (item) => {
        setDeletingItem(item);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingItem) return;
        try {
            await deleteEmployee(deletingItem.id);
            toast.success('Xóa thành công');
            setConfirmOpen(false);
            setDeletingItem(null);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa người dùng');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const dataToSubmit = { ...values };
            if (editingEmployee && !dataToSubmit.password) {
                delete dataToSubmit.password;
            }
            if (editingEmployee) {
                await updateEmployee(editingEmployee.id, dataToSubmit);
            } else {
                await createEmployee(dataToSubmit);
            }
            toast.success(editingEmployee ? 'Cập nhật thành công' : 'Thêm mới thành công');
            setDialogOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    const roleLabel = (role) => {
        const found = roles.find(r => r.code === role);
        if (found) return found.name;
        if (role === 'admin_org') return 'Quản lý (Legacy)';
        if (role === 'employee') return 'Nhân viên (Legacy)';
        return role;
    };

    const orgName = (orgId) => {
        const org = organizations.find(o => o.id === orgId);
        return org ? org.name : orgId;
    };

    const sortedEmployees = useMemo(() => {
        if (!employees) return [];
        return [...employees].sort((a, b) => {
            const orgA = orgName(a.org_id) || '';
            const orgB = orgName(b.org_id) || '';
            const orgCompare = orgA.localeCompare(orgB, 'vi', { sensitivity: 'base' });
            if (orgCompare !== 0) return orgCompare;

            const roleA = roleLabel(a.role) || '';
            const roleB = roleLabel(b.role) || '';
            const roleCompare = roleA.localeCompare(roleB, 'vi', { sensitivity: 'base' });
            if (roleCompare !== 0) return roleCompare;

            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
        });
    }, [employees, organizations, roles]);

    return {
        // Auth / context
        userRole,
        hasPermission,
        isCompanyLevel,
        urlOrgName,
        initialOrgId,

        // Data
        employees: sortedEmployees,
        loading,
        totalItems,
        organizations,

        // Pagination
        page,
        rowsPerPage,
        setPage,
        setRowsPerPage,

        // Filters
        filterInputs,
        setFilterInputs,

        // Dialog
        dialogOpen,
        setDialogOpen,
        editingEmployee,

        // Confirm dialog
        confirmOpen,
        setConfirmOpen,
        deletingItem,

        // Handlers
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleConfirmDelete,
        handleSubmit,

        // Helpers
        roleLabel,
        orgName,
    };
};

export default useEmployeeList;
