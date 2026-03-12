import { useState, useEffect, useCallback } from 'react';
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

const InundationForm = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const userRole = localStorage.getItem('role') || 'employee';
    const basePath = userRole === 'employee' ? '/company' : '/admin';

    const [tab, setTab] = useState(0); // 0 = Báo mới/Cập nhật, 1 = Chi tiết
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

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam !== null) setTab(parseInt(tabParam));

        const reportId = searchParams.get('id');
        if (reportId) fetchReport(reportId);
        else setSelectedReport(null);
    }, [searchParams, fetchReport]);

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
        const allTabs = [
            { id: 0, label: selectedReport ? 'Cập nhật' : 'Báo mới', icon: <IconPlus size={18} /> },
            { id: 1, label: 'Chi tiết', icon: <IconHistory size={18} /> }
        ];

        const isReadOnly = searchParams.get('readonly') === 'true';

        // Hide "Cập nhật" tab if report is already resolved or in readonly mode
        const visibleTabs = (selectedReport?.status === 'resolved' || isReadOnly)
            ? allTabs.filter(t => t.id === 1)
            : allTabs;

        if (visibleTabs.length <= 1) return null;

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

    const renderContent = () => (
        <Box sx={{ width: '100%' }}>
            {TabSwitcher()}
            {tab === 0 ? (
                <InundationReportPanel
                    selectedReport={selectedReport}
                    pointId={searchParams.get('point_id')}
                    initialStreetName={searchParams.get('name')}
                    onSuccess={handleSuccess}
                />
            ) : (
                <InundationDetail
                    selectedReport={selectedReport}
                    loadingReport={loadingReport}
                />
            )}
        </Box>
    );

    if (isMobile) {
        return (
            <Box sx={{ px: 2, pt: 2 }}>
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