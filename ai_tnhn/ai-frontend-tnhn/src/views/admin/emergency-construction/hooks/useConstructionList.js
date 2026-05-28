import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';
import useEmergencyStore from 'store/useEmergencyStore';
import useOrganizationStore from 'store/useOrganizationStore';

const useConstructionList = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Auth state
    const { role: userRole, user: userInfo, hasPermission } = useAuthStore();
    const userOrgId = userInfo?.org_id || '';

    // Emergency Store state & actions
    const {
        items,
        loading,
        totalItems,
        page,
        rowsPerPage,
        filters,
        fetchItems,
        setPage,
        setRowsPerPage,
        setFilters,
        createItem,
        updateItem,
        deleteItem
    } = useEmergencyStore();

    // Search and filters input state
    const initialOrgId = searchParams.get('org_id') || filters.org_id || '';
    const [filterInputs, setFilterInputs] = useState({ ...filters, org_id: initialOrgId });

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Organization data state
    const { fetchSelectionList } = useOrganizationStore();
    const [orgs, setOrgs] = useState({ primary: [], shared: [] });

    const fetchOrgs = async () => {
        try {
            const res = await fetchSelectionList();
            setOrgs(res || { primary: [], shared: [] });
        } catch (err) {
            console.error('Lỗi tải danh sách công ty:', err);
        }
    };

    const orgNamesMap = useMemo(() => {
        const map = {};
        (orgs.primary || []).forEach(o => {
            map[o.id] = o.name;
        });
        (orgs.shared || []).forEach(o => {
            map[o.id] = o.name;
        });
        return map;
    }, [orgs]);

    useEffect(() => {
        fetchOrgs();
    }, [fetchSelectionList]);

    useEffect(() => {
        fetchItems();
    }, [page, rowsPerPage, filters, fetchItems]);

    const handleSearch = () => {
        setFilters(filterInputs);
    };

    const handleOpenCreate = () => {
        setEditingItem(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setDialogOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa công trình này?')) return;
        try {
            await deleteItem(id);
            toast.success('Xóa thành công');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa công trình');
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingItem) {
                await updateItem(editingItem.id, values);
            } else {
                await createItem(values);
            }
            toast.success(editingItem ? 'Cập nhật thành công' : 'Thêm mới thành công');
            setDialogOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    return {
        navigate,
        userRole,
        userOrgId,
        items,
        loading,
        totalItems,
        page,
        rowsPerPage,
        filters,
        filterInputs,
        setFilterInputs,
        dialogOpen,
        setDialogOpen,
        editingItem,
        orgs,
        orgNamesMap,
        setPage,
        setRowsPerPage,
        handleSearch,
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleSubmit,
        hasPermission
    };
};

export default useConstructionList;
