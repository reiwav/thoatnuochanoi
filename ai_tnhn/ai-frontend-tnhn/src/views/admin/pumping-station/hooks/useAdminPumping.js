import { useState, useEffect, useMemo } from 'react';
import pumpingStationApi from 'api/pumpingStation';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';
import organizationApi from 'api/organization';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';

export const useAdminPumping = () => {
    const { user, isCompany, hasPermission } = useAuthStore();
    
    const [activeTab, setActiveTab] = useState(0); // 0: Pumping, 1: Wastewater
    const [drillDownStation, setDrillDownStation] = useState(null);

    const [pumpingData, setPumpingData] = useState([]);
    const [wasteData, setWasteData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog states
    const [openPumping, setOpenPumping] = useState(false);
    const [openWaste, setOpenWaste] = useState(false);
    const [openHistory, setOpenHistory] = useState(false);
    const [selected, setSelected] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    
    const [orgs, setOrgs] = useState({ primary: [], shared: [] });
    const [orgFilter, setOrgFilter] = useState((!isCompany && user?.org_id) ? user.org_id : '');
    const [searchFilter, setSearchFilter] = useState('');
    const [sortOrder, setSortOrder] = useState('default');

    const currentData = activeTab === 0 ? pumpingData : wasteData;

    const filteredData = useMemo(() => {
        if (!Array.isArray(currentData)) return [];
        const q = searchFilter.toLowerCase();
        const filtered = currentData.filter(item =>
            item.name?.toLowerCase().includes(q) ||
            item.address?.toLowerCase().includes(q)
        );
        if (sortOrder === 'default' || !sortOrder) return filtered;
        return filtered.sort((a, b) => {
            const valA = a.priority || 0;
            const valB = b.priority || 0;
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });
    }, [currentData, searchFilter, sortOrder]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pRes, wRes, oRes] = await Promise.all([
                pumpingStationApi.list({ per_page: 1000, org_id: orgFilter }),
                wastewaterTreatmentApi.list({ per_page: 1000, org_id: orgFilter }),
                organizationApi.getSelectionList()
            ]);
            setPumpingData(pRes?.data || (Array.isArray(pRes) ? pRes : []));
            setWasteData(wRes?.data || (Array.isArray(wRes) ? wRes : []));
            setOrgs(oRes || { primary: [], shared: [] });
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [orgFilter]);

    const handleAdd = () => {
        setSelected(null);
        if (activeTab === 0) setOpenPumping(true);
        else setOpenWaste(true);
    };

    const handleEdit = (item) => {
        setSelected(item);
        if (activeTab === 0) setOpenPumping(true);
        else setOpenWaste(true);
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
            if (activeTab === 0) await pumpingStationApi.delete(deletingItem.id);
            else await wastewaterTreatmentApi.delete(deletingItem.id);
            toast.success('Xóa thành công');
            loadData();
        } catch (error) {
            toast.error('Xóa thất bại');
        } finally {
            setConfirmOpen(false);
            setLoading(false);
        }
    };

    const getOrgNames = (ids) => {
        if (!ids) return '';
        const idList = Array.isArray(ids) ? ids : [ids];
        const allOrgs = [...(orgs.primary || []), ...(orgs.shared || [])];
        return idList.map(id => allOrgs.find(o => o.id === id)?.name).filter(Boolean).join(', ');
    };

    return {
        user,
        isCompany,
        hasPermission,
        activeTab,
        setActiveTab,
        drillDownStation,
        setDrillDownStation,
        loading,
        setLoading,
        openPumping,
        setOpenPumping,
        openWaste,
        setOpenWaste,
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
        sortOrder,
        setSortOrder,
        filteredData,
        loadData,
        handleAdd,
        handleEdit,
        handleHistory,
        handleDelete,
        handleConfirmDelete,
        getOrgNames
    };
};
