import { useState, useEffect, useMemo } from 'react';
import usePumpingStationStore from 'store/usePumpingStationStore';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';

const useStationPumpingSummary = () => {
    const { pumpingStations, loading: loadingPumping, fetchPumpingStations } = usePumpingStationStore();
    
    const [wasteStations, setWasteStations] = useState([]);
    const [loadingWaste, setLoadingWaste] = useState(false);
    const [activeTab, setActiveTab] = useState(0); // 0: Pumping, 1: Wastewater
    const [drillDownStation, setDrillDownStation] = useState(null);

    const [selectedOrg, setSelectedOrg] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [taskDialog, setTaskDialog] = useState({ open: false, data: null, mode: 'PUMPING' });

    const fetchWasteStations = async () => {
        setLoadingWaste(true);
        try {
            const res = await wastewaterTreatmentApi.list({ per_page: 1000 });
            setWasteStations(res?.data || (Array.isArray(res) ? res : []));
        } catch (error) {
            console.error('Failed to fetch waste stations', error);
        } finally {
            setLoadingWaste(false);
        }
    };

    useEffect(() => {
        fetchPumpingStations();
        fetchWasteStations();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTab === 0) fetchPumpingStations();
            else fetchWasteStations();
        }, 30000); 
        return () => clearInterval(interval);
    }, [activeTab]);

    const activeList = activeTab === 0 ? pumpingStations : wasteStations;
    const isLoading = activeTab === 0 ? loadingPumping : loadingWaste;

    const filteredStations = useMemo(() => {
        let result = activeList;
        if (selectedOrg !== 'all' && selectedOrg) {
            result = result.filter(s => (s.org_id === selectedOrg || s.orgID === selectedOrg));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(s => 
                s.name?.toLowerCase().includes(q) || 
                s.address?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [activeList, searchQuery, selectedOrg]);

    const handleUpdate = (station) => {
        setTaskDialog({ 
            open: true, 
            data: station, 
            mode: activeTab === 0 ? 'PUMPING' : 'WASTEWATER' 
        });
    };

    const handleViewHistory = (station) => {
        setDrillDownStation(station);
    };

    return {
        pumpingStations,
        wasteStations,
        activeTab,
        setActiveTab,
        drillDownStation,
        setDrillDownStation,
        selectedOrg,
        setSelectedOrg,
        searchQuery,
        setSearchQuery,
        taskDialog,
        setTaskDialog,
        isLoading,
        filteredStations,
        handleUpdate,
        handleViewHistory,
        fetchPumpingStations,
        fetchWasteStations
    };
};

export default useStationPumpingSummary;
