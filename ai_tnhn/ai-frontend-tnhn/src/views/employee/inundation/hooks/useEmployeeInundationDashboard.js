import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import useAuthStore from 'store/useAuthStore';
import useInundationStore from 'store/useInundationStore';

const useEmployeeInundationDashboard = () => {
    const navigate = useNavigate();
    const { search } = useLocation();
    const basePath = '/employee';

    const { user: userInfo, logout, fetchPermissions } = useAuthStore();
    const {
        points,
        historyReports,
        loading,
        loadingHistory,
        fetchInitialData,
        fetchPoints,
        fetchHistory,
        filters,
        setFilters
    } = useInundationStore();

    // Local UI states
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
    const [historyPage] = useState(0);
    const [historyRowsPerPage] = useState(10);

    // Dialog state
    const [taskDialog, setTaskDialog] = useState({ open: false, mode: '', data: null });
    const [detailDialog, setDetailDialog] = useState({ open: false, point: null });

    // Read activeTab from URL
    const params = new URLSearchParams(search);
    const activeTab = parseInt(params.get('activeTab') || '0');

    // Initial Fetch
    useEffect(() => {
        fetchInitialData();
        fetchPermissions();
    }, []);

    // Fallback polling (60s) if SSE is down
    useEffect(() => {
        const interval = setInterval(() => {
            const isSseConnected = useInundationStore.getState().sseConnected;
            if (!isSseConnected && activeTab <= 1) {
                fetchPoints();
            }
        }, 60000);
        return () => {
            clearInterval(interval);
        };
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 2) {
            fetchHistory(historyPage, historyRowsPerPage);
        }
    }, [activeTab, historyPage, historyRowsPerPage, filters.orgFilter, filters.statusFilter, filters.searchQuery]);

    const stats = useMemo(() => {
        const active = points.filter((p) => !!p.report_id).length;
        const total = points.length;
        const normal = total - active;
        return { active, total, normal };
    }, [points]);

    const filteredPoints = useMemo(() => {
        let result = activeTab === 1 ? points.filter((p) => !!p.report_id) : points;

        if (filters.statusFilter === 'active') result = result.filter((p) => !!p.report_id);
        if (filters.statusFilter === 'normal') result = result.filter((p) => !p.report_id);

        if (filters.orgFilter !== 'all' && filters.orgFilter) {
            result = result.filter((p) => p.org_id === filters.orgFilter);
        }

        if (filters.searchQuery.trim()) {
            const q = filters.searchQuery.toLowerCase();
            result = result.filter((p) => p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q));
        }

        return [...result].sort((a, b) => {
            if (a.report_id && !b.report_id) return -1;
            if (!a.report_id && b.report_id) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [points, activeTab, filters]);

    const handleLogout = () => {
        logout();
        navigate('/pages/login', { replace: true });
    };

    const handleOpenViewer = (imgs, idx = 0) => setViewer({ open: true, images: imgs, index: idx });
    const handleOpenDetail = (point) => setDetailDialog({ open: true, point });

    const openTask = (mode, point) => {
        setTaskDialog({ open: true, mode, data: point });
    };

    return {
        // Auth
        userInfo,
        // Navigation
        navigate,
        basePath,
        activeTab,
        // Data
        points,
        historyReports,
        loading,
        loadingHistory,
        filters,
        setFilters,
        stats,
        filteredPoints,
        fetchPoints,
        // Viewer
        viewer,
        setViewer,
        handleOpenViewer,
        // Task Dialog
        taskDialog,
        setTaskDialog,
        openTask,
        // Detail Dialog
        detailDialog,
        setDetailDialog,
        handleOpenDetail,
        // Actions
        handleLogout
    };
};

export default useEmployeeInundationDashboard;
