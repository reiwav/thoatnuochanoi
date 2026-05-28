import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useAuthStore from 'store/useAuthStore';
import stationApi from 'api/station';
import organizationApi from 'api/organization';
import { toast } from 'react-hot-toast';
import { getDataArray } from 'utils/apiHelper';

const useLakeList = () => {
    const { user, isCompany, isSuperAdmin, hasPermission } = useAuthStore();

    const canCreate = isSuperAdmin || hasPermission('water:create');
    const canEdit = isSuperAdmin || hasPermission('water:edit');
    const canDelete = isSuperAdmin || hasPermission('water:delete');

    const [loading, setLoading] = useState(false);
    const [stations, setStations] = useState([]);
    const [organizations, setOrganizations] = useState({ primary: [], shared: [] });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [sortOrder, setSortOrder] = useState('default');

    const isCompanyLevel = isCompany || user?.role === 'super_admin';
    const initialOrgId = '';

    const [filterInputs, setFilterInputs] = useState({ search: '', active: '', org_id: initialOrgId });
    const [params, setParams] = useState({ search: '', active: '', org_id: initialOrgId });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStation, setEditingStation] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [stRes, orgRes] = await Promise.all([
                stationApi.lake.getAll({ ...params, page: page + 1, per_page: rowsPerPage }),
                organizationApi.getSelectionList()
            ]);

            if (stRes) {
                const stationList = stRes.tram || getDataArray(stRes);
                setStations(stationList);
                setTotalItems(stRes.total || stationList.length);
            }

            if (orgRes) {
                setOrganizations(orgRes || { primary: [], shared: [] });
            }
        } catch (err) {
            console.error('Lỗi tải dữ liệu:', err);
            toast.error('Không thể tải danh sách trạm');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, params]);

    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            setParams(filterInputs);
            setPage(0);
        }, 500);
        return () => clearTimeout(timer);
    }, [filterInputs]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenCreate = useCallback(() => {
        setEditingStation(null);
        setDialogOpen(true);
    }, []);

    const handleOpenEdit = useCallback((station) => {
        setEditingStation(station);
        setDialogOpen(true);
    }, []);

    const handleDelete = useCallback((item) => {
        setDeletingItem(item);
        setConfirmOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!deletingItem) return;
        setLoading(true);
        try {
            await stationApi.lake.delete(deletingItem.id);
            toast.success('Xóa thành công');
            setConfirmOpen(false);
            setDeletingItem(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa trạm');
        } finally {
            setLoading(false);
        }
    }, [deletingItem, loadData]);

    const handleSubmit = useCallback(async (values) => {
        try {
            const res = editingStation
                ? await stationApi.lake.update(editingStation.id, values)
                : await stationApi.lake.create(values);

            if (res) {
                toast.success(editingStation ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadData();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    }, [editingStation, loadData]);

    const organizationNamesMap = useMemo(() => {
        return (organizations.shared || []).reduce((acc, org) => {
            acc[org.id] = org.name;
            return acc;
        }, {});
    }, [organizations.shared]);

    const getOrgName = useCallback((orgId) => {
        return organizationNamesMap[orgId] || '';
    }, [organizationNamesMap]);

    const sortedStations = useMemo(() => {
        if (sortOrder === 'default' || !sortOrder) return stations;
        return [...stations].sort((a, b) => {
            const weightA = a.TrongSoBaoCao || 0;
            const weightB = b.TrongSoBaoCao || 0;
            return sortOrder === 'asc' ? weightA - weightB : weightB - weightA;
        });
    }, [stations, sortOrder]);

    return {
        user,
        isCompanyLevel,
        isSuperAdmin,
        canCreate,
        canEdit,
        canDelete,
        loading,
        stations,
        organizations,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        totalItems,
        sortOrder,
        setSortOrder,
        filterInputs,
        setFilterInputs,
        dialogOpen,
        setDialogOpen,
        editingStation,
        confirmOpen,
        setConfirmOpen,
        deletingItem,
        loadData,
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleConfirmDelete,
        handleSubmit,
        organizationNamesMap,
        getOrgName,
        sortedStations
    };
};

export default useLakeList;
