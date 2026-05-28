import { useState, useEffect } from 'react';
import useAuthStore from 'store/useAuthStore';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';
import organizationApi from 'api/organization';
import { toast } from 'react-hot-toast';

const useWastewaterTreatmentList = () => {
    const { user, isCompany, hasPermission } = useAuthStore();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [openHistory, setOpenHistory] = useState(false);
    const [selected, setSelected] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    const [orgs, setOrgs] = useState({ primary: [], shared: [] });

    const [orgFilter, setOrgFilter] = useState((!isCompany && user?.org_id) ? user.org_id : '');
    const [searchFilter, setSearchFilter] = useState('');
    const [filteredData, setFilteredData] = useState([]);

    const fetchStations = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await wastewaterTreatmentApi.list({ per_page: 1000, org_id: orgFilter });
            setData(res?.data || []);
        } catch (error) {
            console.error('Failed to fetch wastewater stations', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchOrgs = async () => {
        try {
            const res = await organizationApi.getSelectionList();
            setOrgs(res || { primary: [], shared: [] });
        } catch (error) {
            console.error('Failed to fetch orgs', error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchStations(true), fetchOrgs()]);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [orgFilter]);

    useEffect(() => {
        if (!Array.isArray(data)) {
            setFilteredData([]);
            return;
        }
        const q = searchFilter.toLowerCase();
        const filtered = data.filter(item =>
            item.name?.toLowerCase().includes(q) ||
            item.address?.toLowerCase().includes(q)
        );
        setFilteredData(filtered);
    }, [data, searchFilter]);

    const handleAdd = () => {
        setSelected(null);
        setOpen(true);
    };

    const handleEdit = (item) => {
        setSelected(item);
        setOpen(true);
    };

    const handleHistory = (item) => {
        setSelected(item);
        setOpenHistory(true);
    };

    const handleDelete = (item) => {
        setDeletingItem(item);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingItem) return;
        setLoading(true);
        try {
            await wastewaterTreatmentApi.delete(deletingItem.id);
            setConfirmOpen(false);
            setDeletingItem(null);
            loadData();
            toast.success('Xóa thành công');
        } catch (error) {
            toast.error('Xóa thất bại');
        } finally {
            setLoading(false);
        }
    };

    const getOrgNames = (ids) => {
        if (!ids) return '';
        const idList = Array.isArray(ids) ? ids : [ids];
        const allOrgs = [...(orgs.primary || []), ...(orgs.shared || [])];
        return idList
            .map((id) => allOrgs.find((o) => o.id === id)?.name)
            .filter((name) => !!name)
            .join(', ');
    };

    return {
        user,
        isCompany,
        hasPermission,
        loading,
        setLoading,
        open,
        setOpen,
        openHistory,
        setOpenHistory,
        selected,
        setSelected,
        confirmOpen,
        setConfirmOpen,
        deletingItem,
        setDeletingItem,
        orgs,
        orgFilter,
        setOrgFilter,
        searchFilter,
        setSearchFilter,
        filteredData,
        handleAdd,
        handleEdit,
        handleHistory,
        handleDelete,
        handleConfirmDelete,
        getOrgNames,
        loadData
    };
};

export default useWastewaterTreatmentList;
