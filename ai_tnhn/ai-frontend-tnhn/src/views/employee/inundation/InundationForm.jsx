import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box, Button, Typography, Stack,
    IconButton, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconArrowLeft, IconPlus, IconHistory
} from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

import MainCard from 'ui-component/cards/MainCard';
import inundationApi from 'api/inundation';
import InundationReportPanel from './InundationReportPanel';
import InundationDetail from './InundationDetail';
import InundationMechPanel from './InundationMechPanel';
import useAuthStore from 'store/useAuthStore';
import { IconSettings } from '@tabler/icons-react'; // For Mech tab icon

const InundationForm = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Get auth state from Zustand
    const { isEmployee, role: userRole, user } = useAuthStore();
    
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const basePath = isEmployee ? '/company' : '/admin';

    const [tab, setTab] = useState(0); // 0 = Báo mới/Cập nhật, 1 = Chi tiết, 'mech' = Cơ giới
    const [selectedReport, setSelectedReport] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);

    const fetchReport = useCallback(async (reportId) => {
        setLoadingReport(true);
        try {
            const res = await inundationApi.getReport(reportId);
            if (res.data?.status === 'success') {
                const report = res.data.data;
                setSelectedReport(report);
                // Auto-switch to detail tab if report is already resolved
                if (report.status === 'resolved') setTab(1);
            }
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
        if (reportId) fetchReport(reportId);
        else setSelectedReport(null);
    }, [reportId, fetchReport]);

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
        const reportId = searchParams.get('id') || selectedReport?.id;
        if (reportId) {
            fetchReport(reportId);
            // After update, we might want to stay on the same tab or switch to detail
        } else {
            // New report created, maybe go back to dashboard
            navigate(`${basePath}/inundation`);
        }
    };

    const TabSwitcher = () => {
        const isMechWorker = (useAuthStore.getState().hasPermission('inundation:mech') || useAuthStore.getState().hasPermission('inundation:mechanic')) && !useAuthStore.getState().hasPermission('inundation:edit');

        const allTabs = [
            { id: 0, label: selectedReport ? 'Cập nhật' : 'Báo mới', icon: <IconPlus size={18} />, hidden: isMechWorker || !useAuthStore.getState().hasPermission('inundation:edit') },
            { id: 1, label: 'Chi tiết', icon: <IconHistory size={18} />, hidden: isMechWorker || !useAuthStore.getState().hasPermission('inundation:view') },
            { id: 'mech', label: 'Cơ giới', icon: <IconSettings size={18} />, hidden: !(useAuthStore.getState().hasPermission('inundation:mech') || useAuthStore.getState().hasPermission('inundation:mechanic')) }
        ];

        const isReadOnly = searchParams.get('readonly') === 'true';

        const needsCorrection = selectedReport?.needs_correction || 
                                selectedReport?.updates?.some(u => u.needs_correction);

        // Hide "Cập nhật" tab if report is already resolved or in readonly mode (unless needs correction)
        const visibleTabs = (selectedReport?.status === 'resolved' || (isReadOnly && !needsCorrection))
            ? allTabs.filter(t => t.id === 1)
            : allTabs.filter(t => !t.hidden);

        if (visibleTabs.length <= 1) {
            // If only one tab is visible, ensure it's selected
            if (visibleTabs.length === 1 && tab !== visibleTabs[0].id) {
                setTab(visibleTabs[0].id);
            }
            return null;
        }

        return (
            <Box sx={{ display: 'flex', bgcolor: 'grey.100', borderRadius: 100, p: 0.5, mb: 3 }}>
                {visibleTabs.map((t) => (
                    <Box
                        key={t.id}
                        onClick={() => {
                            setTab(t.id);
                            const newParams = new URLSearchParams(searchParams);
                            newParams.set('tab', t.id);
                            setSearchParams(newParams);
                        }}
                        sx={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8,
                            py: 0.9, borderRadius: 100, cursor: 'pointer', transition: 'all .2s',
                            bgcolor: tab === t.id ? 'background.paper' : 'transparent',
                            boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
                            color: tab === t.id ? 'secondary.main' : 'text.secondary',
                            fontWeight: tab === t.id ? 700 : 500
                        }}
                    >
                        {t.icon}
                        <Typography sx={{ fontSize: '1rem', fontWeight: 'inherit', color: 'inherit', lineHeight: 1 }}>{t.label}</Typography>
                    </Box>
                ))}
            </Box>
        );
    };

    const renderContent = () => {
        return (
            <Box sx={{ width: '100%' }}>
                {TabSwitcher()}
                {tab === 0 ? (
                    <InundationReportPanel
                        selectedReport={reportToPass}
                        pointId={pointId}
                        initialStreetName={searchParams.get('name')}
                        onSuccess={handleSuccess}
                        isCorrectionMode={isEdit}
                    />
                ) : tab === 'mech' ? (
                    <InundationMechPanel 
                        report={selectedReport}
                        pointId={pointId}
                        onSuccess={fetchReport}
                    />
                ) : (
                    <InundationDetail
                        selectedReport={selectedReport}
                        loadingReport={loadingReport}
                        user={user}
                    />
                )}
            </Box>
        );
    };

    if (isMobile) {
        return (
            <Box sx={{ px: 2, pt: 2, pb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <IconButton size="small" onClick={() => navigate(-1)}>
                        <IconArrowLeft size={20} />
                    </IconButton>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {tab === 0 ? (selectedReport ? 'Cập nhật tình hình' : 'Báo cáo ngập') : 'Chi tiết & Lịch sử'}
                    </Typography>
                </Box>
                {renderContent()}
            </Box>
        );
    }

    return (
        <MainCard
            title={selectedReport ? "Cập nhật tình hình ngập" : "Báo cáo ngập lụt"}
            secondary={<Button variant="outlined" size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate(-1)}>Quay lại</Button>}
        >
            <Box sx={{ maxWidth: 640, mx: 'auto' }}>{renderContent()}</Box>
        </MainCard>
    );
};

export default InundationForm;