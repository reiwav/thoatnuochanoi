import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import emergencyConstructionApi from 'api/emergencyConstruction';
import useAuthStore from 'store/useAuthStore';

const useConstructionReporting = () => {
    const navigate = useNavigate();
    const { search } = useLocation();
    
    // Get auth state from Zustand
    const { role: userRole, user: userInfo, hasPermission, logout } = useAuthStore();

    // Read activeTab from URL query (for mobile bottom nav)
    const params = new URLSearchParams(search);
    const activeTab = parseInt(params.get('activeTab') || '0');

    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [constructions, setConstructions] = useState([]);
    const [history, setHistory] = useState([]);
    const [historyDateFilter, setHistoryDateFilter] = useState(null);
    const [historyConstructionFilter, setHistoryConstructionFilter] = useState([]);
    const [userOrgId, setUserOrgId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const isEmployee = userRole === 'employee' || userRole === 'technician';
    const basePath = isEmployee ? '/company' : '/admin';

    useEffect(() => {
        if (userInfo?.org_id) {
            setUserOrgId(userInfo.org_id);
        }
    }, [userInfo]);

    const loadConstructions = async () => {
        if (!userOrgId) return;
        setLoading(true);
        try {
            const res = await emergencyConstructionApi.getAll({ org_id: userOrgId, per_page: 100 });
            // Interceptor đã bóc tách dữ liệu
            const dataArray = res?.data || (Array.isArray(res) ? res : []);
            setConstructions(dataArray);
        } catch (err) {
            toast.error('Lỗi tải danh sách công trình');
        } finally {
            setLoading(false);
        }
    };

    const loadAllHistory = async () => {
        if (!userOrgId) return;
        setHistoryLoading(true);
        try {
            const allHistory = [];
            for (const c of constructions) {
                const data = await emergencyConstructionApi.getProgressHistory(c.id);
                // Interceptor đã trả về data (mảng) trực tiếp
                if (Array.isArray(data)) {
                    allHistory.push(...data.map(h => ({ ...h, construction_name: c.name })));
                }
            }
            allHistory.sort((a, b) => b.report_date - a.report_date);
            setHistory(allHistory);
        } catch (err) {
            console.error('Lỗi tải lịch sử chung', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleOpenViewer = (imgs, idx = 0) => {
        if (!imgs || imgs.length === 0) return;
        setViewer({ open: true, images: imgs, index: idx });
    };
    const handleCloseViewer = () => setViewer({ ...viewer, open: false });
    const handlePrev = (e) => {
        e?.stopPropagation();
        setViewer((v) => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }));
    };
    const handleNext = (e) => {
        e?.stopPropagation();
        setViewer((v) => ({ ...v, index: (v.index + 1) % v.images.length }));
    };

    useEffect(() => {
        if (userOrgId) loadConstructions();
    }, [userOrgId]);

    useEffect(() => {
        if (activeTab === 2 && constructions.length > 0) {
            loadAllHistory();
        }
    }, [activeTab, constructions]);

    const getStatusChip = (status) => {
        const config = {
            planned: { label: 'Dự kiến', color: 'default' },
            ongoing: { label: 'Đang thi công', color: 'warning' },
            completed: { label: 'Hoàn thành', color: 'success' },
            suspended: { label: 'Tạm dừng', color: 'error' }
        };
        return config[status] || config.planned;
    };

    const filteredConstructions = useMemo(() => {
        let result = activeTab === 1 ? constructions.filter(c => c.status !== 'completed') : constructions;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c => c.name?.toLowerCase().includes(q) || c.location?.toLowerCase().includes(q));
        }
        return result;
    }, [constructions, activeTab, searchQuery]);

    const stats = useMemo(() => {
        const total = constructions.length;
        const ongoing = constructions.filter(c => c.status !== 'completed').length;
        return { total, ongoing };
    }, [constructions]);

    const handleCardClick = (row) => {
        if (!hasPermission('emergency:edit')) {
            toast.error('Bạn không có quyền báo cáo tiến độ');
            return;
        }
        navigate(`${basePath}/emergency-construction/form?id=${row.id}&name=${encodeURIComponent(row.name)}`);
    };

    const handleLogout = () => {
        logout();
        navigate('/pages/login');
    };

    const filteredHistory = useMemo(() => {
        return history.filter(h =>
            (historyConstructionFilter.length === 0 || historyConstructionFilter.includes(h.construction_id)) &&
            (!historyDateFilter || (h.report_date >= historyDateFilter.startOf('day').unix() && h.report_date <= historyDateFilter.endOf('day').unix()))
        );
    }, [history, historyConstructionFilter, historyDateFilter]);

    return {
        // Navigation
        navigate,
        basePath,
        activeTab,
        // Auth
        userInfo,
        isEmployee,
        hasPermission,
        // Loading
        loading,
        historyLoading,
        // Data
        constructions,
        history,
        filteredConstructions,
        filteredHistory,
        stats,
        // Filters
        historyDateFilter,
        setHistoryDateFilter,
        historyConstructionFilter,
        setHistoryConstructionFilter,
        searchQuery,
        setSearchQuery,
        // Pagination
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        // Viewer
        viewer,
        handleOpenViewer,
        handleCloseViewer,
        handlePrev,
        handleNext,
        // Actions
        handleCardClick,
        handleLogout,
        getStatusChip
    };
};

export default useConstructionReporting;
