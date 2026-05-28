import { useState, useEffect } from 'react';
import useAuthStore from 'store/useAuthStore';
import stationApi from 'api/station';
import organizationApi from 'api/organization';
import { toast } from 'react-hot-toast';

const useInundationList = () => {
    const { user, isCompany, isSuperAdmin, hasPermission } = useAuthStore();
    const canCreate = hasPermission('inundation:create');
    const canEdit = hasPermission('inundation:edit');
    const canDelete = hasPermission('inundation:delete');
    
    const [loading, setLoading] = useState(false);
    const [points, setPoints] = useState([]);
    const [organizations, setOrganizations] = useState({ primary: [], shared: [] });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    const [searchFilter, setSearchFilter] = useState('');

    const isCompanyLevel = isCompany || user?.role === 'super_admin';
    const initialOrgFilter = (!isCompanyLevel && user?.org_id) ? user.org_id : '';
    const [orgFilter, setOrgFilter] = useState(initialOrgFilter);

    const organizationNamesMap = (organizations.shared || []).reduce((acc, org) => {
        acc[org.id] = org.name;
        return acc;
    }, {});

    const loadPoints = async () => {
        setLoading(true);
        try {
            const params = {};
            if (orgFilter) params.org_id = orgFilter;

            const data = await stationApi.inundation.getAll(params);
            if (data) {
                let pointsData = Array.isArray(data) ? data : (data.data || []);
                if (searchFilter) {
                    const q = searchFilter.toLowerCase();
                    pointsData = pointsData.filter(p =>
                        p.name?.toLowerCase().includes(q) ||
                        p.address?.toLowerCase().includes(q)
                    );
                }
                const sortedData = [...pointsData].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
                setPoints(sortedData);
            } else {
                setPoints([]);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách điểm ngập:', err);
            setPoints([]);
        } finally {
            setLoading(false);
        }
    };

    const loadOrganizations = async () => {
        try {
            const data = await organizationApi.getSelectionList();
            if (data) {
                setOrganizations(data || { primary: [], shared: [] });
            }
        } catch (err) {
            console.error('Lỗi tải danh sách đơn vị:', err);
        }
    };

    useEffect(() => {
        loadPoints();
    }, [orgFilter, searchFilter]);

    useEffect(() => {
        loadOrganizations();
    }, []);

    const handleOpenCreate = () => {
        setEditingPoint(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (point) => {
        setEditingPoint(point);
        setDialogOpen(true);
    };

    const handleDelete = (item) => {
        setDeletingItem(item);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingItem) return;
        setLoading(true);
        try {
            await stationApi.inundation.delete(deletingItem.id);
            toast.success('Xóa thành công');
            setPoints(prev => prev.filter(p => p.id !== deletingItem.id));
            setConfirmOpen(false);
            setDeletingItem(null);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa điểm ngập');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        try {
            const payload = {
                name: values.TenTram,
                address: values.DiaChi,
                lat: values.Lat,
                lng: values.Lng,
                active: values.Active,
                org_id: values.org_id,
                shared_org_ids: values.shared_org_ids,
                share_all: values.share_all
            };
            const res = editingPoint
                ? await stationApi.inundation.update(editingPoint.id, payload)
                : await stationApi.inundation.create(payload);
            
            if (res) {
                toast.success(editingPoint ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadPoints();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    return {
        user,
        isCompany,
        isSuperAdmin,
        hasPermission,
        canCreate,
        canEdit,
        canDelete,
        loading,
        points,
        organizations,
        dialogOpen,
        setDialogOpen,
        editingPoint,
        confirmOpen,
        setConfirmOpen,
        deletingItem,
        searchFilter,
        setSearchFilter,
        orgFilter,
        setOrgFilter,
        organizationNamesMap,
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleConfirmDelete,
        handleSubmit
    };
};

export default useInundationList;
