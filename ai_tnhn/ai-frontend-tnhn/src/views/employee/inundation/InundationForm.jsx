import {
    Box, Button, Typography, Stack,
    IconButton, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconPlus, IconHistory, IconSettings, IconArrowLeft, IconRuler
} from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import InundationReportPanel from './InundationReportPanel';
import InundationDetail from './InundationDetail';
import InundationMechPanel from './InundationMechPanel';
import InundationSurveyPanel from './InundationSurveyPanel';

// Hook
import useInundationForm from './hooks/useInundationForm';

const InundationForm = () => {
    const theme = useTheme();
    const {
        navigate,
        basePath,
        searchParams,
        tab,
        setTab,
        handleTabChange,
        getVisibleTabs,
        selectedReport,
        loadingReport,
        reportToPass,
        fetchReport,
        pointId,
        isEdit,
        handleSuccess,
        user
    } = useInundationForm();

    const TabSwitcher = () => {
        const visibleTabs = getVisibleTabs();

        if (visibleTabs.length <= 1) {
            if (visibleTabs.length === 1 && tab !== visibleTabs[0].id) {
                setTab(visibleTabs[0].id);
            }
            return null;
        }

        const iconMap = {
            plus: <IconPlus size={18} />,
            history: <IconHistory size={18} />,
            settings: <IconSettings size={18} />,
            ruler: <IconRuler size={18} />
        };

        return (
            <Box sx={{ display: 'flex', bgcolor: 'grey.100', borderRadius: 100, p: 0.5, mb: 3 }}>
                {visibleTabs.map((t) => (
                    <Box
                        key={t.id}
                        onClick={() => handleTabChange(t.id)}
                        sx={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8,
                            py: 0.9, borderRadius: 100, cursor: 'pointer', transition: 'all .2s',
                            bgcolor: tab === t.id ? 'background.paper' : 'transparent',
                            boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
                            color: tab === t.id ? 'secondary.main' : 'text.secondary',
                            fontWeight: tab === t.id ? 700 : 500
                        }}
                    >
                        {iconMap[t.icon]}
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
                        key={selectedReport?.id || pointId || 'new-mech'}
                        report={selectedReport}
                        pointId={pointId || selectedReport?.point_id}
                        onSuccess={fetchReport}
                    />
                ) : tab === 'survey' ? (
                    <InundationSurveyPanel
                        key={selectedReport?.id || pointId || 'new-survey'}
                        report={selectedReport}
                        pointId={pointId || selectedReport?.point_id}
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

    return (
        <Box sx={{
            px: { xs: 2, md: 0 },
            pt: { xs: 2, md: 0 },
            pb: { xs: 4, md: 0 }
        }}>
            {/* Mobile Header: Visible only on xs/sm */}
            <Box sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                gap: 1,
                mb: 2
            }}>
                <IconButton size="small" onClick={() => navigate(-1)}>
                    <IconArrowLeft size={20} />
                </IconButton>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {tab === 0 ? (selectedReport ? 'Cập nhật tình hình' : 'Báo cáo ngập') : 'Chi tiết & Lịch sử'}
                </Typography>
            </Box>

            {/* Main Content: On Desktop it's wrapped in MainCard, on Mobile it's just the content */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <MainCard
                    title={selectedReport ? "Cập nhật tình hình ngập" : "Báo cáo ngập lụt"}
                    secondary={<Button variant="outlined" size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate(-1)}>Quay lại</Button>}
                >
                    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
                        {renderContent()}
                    </Box>
                </MainCard>
            </Box>

            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {renderContent()}
            </Box>
        </Box>
    );
};

export default InundationForm;