import { useState, useEffect, useMemo } from 'react';

import useAuthStore from 'store/useAuthStore';
import usePumpingStationStore from 'store/usePumpingStationStore';
import pumpingStationApi from 'api/pumpingStation';

const useEmployeePumpingDashboard = () => {
    const { user } = useAuthStore();
    const { pumpingStations, loading, fetchPumpingStations } = usePumpingStationStore();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [assignedStation, setAssignedStation] = useState(null);
    const [fetchingAssigned, setFetchingAssigned] = useState(false);
    const [taskDialog, setTaskDialog] = useState({ open: false, data: null });
    const [historyDialog, setHistoryDialog] = useState({ open: false, data: null });

    // 1. Fetch Assigned Station if any
    useEffect(() => {
        const fetchAssigned = async () => {
            if (user?.assigned_pumping_station_id) {
                setFetchingAssigned(true);
                try {
                    const res = await pumpingStationApi.get(user.assigned_pumping_station_id);
                    setAssignedStation(res);
                } catch (err) {
                    console.error('Failed to fetch assigned station:', err);
                } finally {
                    setFetchingAssigned(false);
                }
            } else {
                fetchPumpingStations();
            }
        };
        fetchAssigned();
    }, [user?.assigned_pumping_station_id]);

    // Polling
    useEffect(() => {
        if (!user?.assigned_pumping_station_id) {
            const interval = setInterval(() => {
                fetchPumpingStations();
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [user?.assigned_pumping_station_id]);

    const handleRefresh = () => {
        if (user?.assigned_pumping_station_id) {
            pumpingStationApi.get(user.assigned_pumping_station_id).then(setAssignedStation);
        } else {
            fetchPumpingStations();
        }
    };

    const filteredStations = useMemo(() => {
        if (!searchQuery.trim()) return pumpingStations;
        const q = searchQuery.toLowerCase();
        return pumpingStations.filter(s => s.name?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
    }, [pumpingStations, searchQuery]);

    return {
        // Auth
        user,
        // Data
        pumpingStations,
        loading,
        assignedStation,
        fetchingAssigned,
        filteredStations,
        // Search
        searchQuery,
        setSearchQuery,
        // Dialog
        taskDialog,
        setTaskDialog,
        historyDialog,
        setHistoryDialog,
        // Actions
        handleRefresh
    };
};

export default useEmployeePumpingDashboard;
