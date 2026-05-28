import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import inundationApi from 'api/inundation';
import useAuthStore from 'store/useAuthStore';

const useInundationForm = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Get auth state from Zustand
    const { isEmployee, role: userRole, user } = useAuthStore();

    const basePath = isEmployee ? '/company' : '/admin';

    const [tab, setTab] = useState(0); // 0 = Báo mới/Cập nhật, 1 = Chi tiết, 'mech' = Cơ giới
    const [selectedReport, setSelectedReport] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);

    const fetchReport = useCallback(async (reportId) => {
        setLoadingReport(true);
        try {
            const res = await inundationApi.getReport(reportId);
            const report = res;
            setSelectedReport(report);
            // Auto-switch to detail tab if report is already resolved
            if (report.status === 'resolved') setTab(1);
        } catch (err) {
            toast.error('Lỗi khi tải thông tin đợt ngập');
        } finally {
            setLoadingReport(false);
        }
    }, []);

    const reportId = searchParams.get('id');
    const pointId = searchParams.get('point_id');
    const tabParam = searchParams.get('tab');
    const editUpdateId = searchParams.get('edit_update_id');
    const isEdit = searchParams.get('edit') === 'true' || !!editUpdateId;

    useEffect(() => {
        if (tabParam !== null) {
            const t = isNaN(tabParam) ? tabParam : parseInt(tabParam);
            setTab(t);
        }
    }, [tabParam]);

    useEffect(() => {
        if (reportId) {
            fetchReport(reportId);
        } else if (pointId) {
            // Find active report for this point
            const findActive = async () => {
                setLoadingReport(true);
                try {
                    const points = await inundationApi.getPointsStatus();
                    // Interceptor đã bóc tách nên points đã là mảng hoặc payload chính
                    const pointsArray = Array.isArray(points) ? points : (points?.data || []);
                    const p = pointsArray.find(item => item.id === pointId);
                    if (p && p.report_id && p.last_report) {
                        setSelectedReport(p.last_report);
                    } else {
                        setSelectedReport(null);
                    }
                } catch (err) {
                    console.error('Failed to find active report for point:', pointId);
                } finally {
                    setLoadingReport(false);
                }
            };
            findActive();
        } else {
            setSelectedReport(null);
        }
    }, [reportId, pointId, fetchReport]);

    const reportToPass = useMemo(() => {
        if (!selectedReport) return null;
        if (editUpdateId) {
            const upd = selectedReport.updates?.find(u => u.id === editUpdateId);
            if (upd) return { ...upd, type: 'update', is_update_record: true };
        }
        if (isEdit) {
            return { ...selectedReport, type: 'start' };
        }
        return selectedReport;
    }, [selectedReport, editUpdateId, isEdit]);

    const handleSuccess = () => {
        const rId = searchParams.get('id') || selectedReport?.id;
        if (rId) {
            fetchReport(rId);
        } else {
            navigate(`${basePath}/inundation`);
        }
    };

    const getVisibleTabs = () => {
        const isMechWorker = (useAuthStore.getState().hasPermission('inundation:mech') || useAuthStore.getState().hasPermission('inundation:mechanic')) && !useAuthStore.getState().hasPermission('inundation:edit');
        const isSurveyWorker = useAuthStore.getState().hasPermission('inundation:survey') && !useAuthStore.getState().hasPermission('inundation:edit');
        const isReadOnly = searchParams.get('readonly') === 'true';

        const needsCorrection = selectedReport?.needs_correction ||
            selectedReport?.updates?.some(u => u.needs_correction);

        const allTabs = [
            { id: 0, label: selectedReport ? 'Cập nhật' : 'Báo mới', icon: 'plus', hidden: isMechWorker || isSurveyWorker || !useAuthStore.getState().hasPermission('inundation:edit') },
            { id: 1, label: 'Chi tiết', icon: 'history', hidden: isMechWorker || isSurveyWorker || !useAuthStore.getState().hasPermission('inundation:view') },
            { id: 'mech', label: 'XN Cơ giới', icon: 'settings', hidden: !(useAuthStore.getState().hasPermission('inundation:mech') || useAuthStore.getState().hasPermission('inundation:mechanic')) },
            { id: 'survey', label: 'Khảo sát', icon: 'ruler', hidden: !useAuthStore.getState().hasPermission('inundation:survey') }
        ];

        const visibleTabs = (selectedReport?.status === 'resolved' || (isReadOnly && !needsCorrection))
            ? allTabs.filter(t => t.id === 1)
            : allTabs.filter(t => !t.hidden);

        return visibleTabs;
    };

    const handleTabChange = (tabId) => {
        setTab(tabId);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', tabId);
        setSearchParams(newParams);
    };

    return {
        // Navigation
        navigate,
        basePath,
        searchParams,
        // Tab
        tab,
        setTab,
        handleTabChange,
        getVisibleTabs,
        // Report data
        selectedReport,
        loadingReport,
        reportToPass,
        fetchReport,
        // URL params
        pointId,
        isEdit,
        // Handlers
        handleSuccess,
        // Auth
        user
    };
};

export default useInundationForm;
